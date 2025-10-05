using Microsoft.AspNetCore.Authentication.Cookies;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;

using Microsoft.IdentityModel.Tokens;
using Northeast.Data;
using Northeast.Interface;

using Northeast.Models;
using Northeast.Options;
using Northeast.Repository;
using Northeast.Services;
using Northeast.Services.Similarity;
using Northeast.Utilities;
using Microsoft.Extensions.Http.Resilience; // StandardResilienceOptions
using Microsoft.Extensions.Options;
using Polly.Timeout;                        // ? Polly timeout

using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
// ? Timeout.InfiniteTimeSpan

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.local.json", optional: true, reloadOnChange: true);

var originsPolicy = "AuthorizedApps";

// --- Add Services ---
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- Request size limits (allow large JSON/multipart uploads) ---
// Increase Kestrel's max request body size (e.g., 500 MB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 524_288_000; // 500 MB
});

// If/when using multipart form uploads, raise multipart limit too
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 524_288_000; // 500 MB
});

// --- DbContext ---
builder.Services.AddDbContext<AppDbContext>();

builder.Services.Configure<HostOptions>(options =>
{
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

// --- Application Services ---
builder.Services.AddScoped<UserRegistration>();
builder.Services.AddScoped<UserAuthentification>();
builder.Services.AddScoped<ArticleServices>();
builder.Services.AddScoped<AiArticleWriterService>();
builder.Services.AddScoped<CocktailService>();
builder.Services.AddScoped<GenerateJwt>();
builder.Services.AddScoped<GetConnectedUser>();
builder.Services.AddScoped<OTPservices>();
builder.Services.AddTransient<SendEmail>();
builder.Services.AddScoped<SiteVisitorServices>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient(); // generic (no special policies)
builder.Services.Configure<IndexNowOptions>(builder.Configuration.GetSection("IndexNow"));
builder.Services.AddHttpClient("IndexNow");
builder.Services.AddSingleton<IIndexNowService, IndexNowService>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IAiTransientCache, AiTransientCache>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<ArticleRepository>();
builder.Services.AddScoped<CocktailRepository>();
builder.Services.AddScoped<CommentRepository>();
builder.Services.AddScoped<LikeRepository>();
builder.Services.AddScoped<OTPrepository>();
builder.Services.AddScoped<VisitorsRepository>();
builder.Services.AddScoped<LoginHistoryRepository>();
builder.Services.AddScoped<PageVisitRepository>();
builder.Services.AddScoped<NotificationRepository>();
builder.Services.AddScoped<CommentReportRepository>();
builder.Services.AddScoped<ITokenizationService, TokenizationService>();
builder.Services.AddScoped<ISimilarityService, SimilarityService>();
builder.Services.AddScoped<IArticleRecommendationService, ArticleRecommendationService>();
builder.Services.AddSingleton<IAiWriteQueue, AiWriteQueue>();
builder.Services.AddHostedService<AiWriteWorker>();
builder.Services.AddSingleton<ResearchAggregator>();
builder.Services.AddHttpClient("research", c =>
{
    c.Timeout = TimeSpan.FromSeconds(20);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; NortheastBot/1.0)");
});

// --- HTTP clients with resilience (named "default") ---
builder.Services.AddHttpClient("default")
    .ConfigureHttpClient(c =>
    {
        c.Timeout = Timeout.InfiniteTimeSpan; // ? Polly owns timeouts
    })
    .AddStandardResilienceHandler(o =>
    {
        // Timeouts
        o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(60);
        o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(150);

        // Circuit breaker rule: SamplingDuration >= 2 × AttemptTimeout
        o.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(2); // ? >= 120s
        o.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
        o.CircuitBreaker.FailureRatio = 0.2;
        o.CircuitBreaker.MinimumThroughput = 10;

        // Retry
        o.Retry.MaxRetryAttempts = 2;
        o.Retry.ShouldHandle = args =>
            new ValueTask<bool>(
                args.Outcome.Exception is HttpRequestException
                || args.Outcome.Exception is TimeoutRejectedException
                || (args.Outcome.Result is { } r &&
                    (r.StatusCode == HttpStatusCode.RequestTimeout || (int)r.StatusCode >= 500))
            );
    });

// Ensure valid resilience options for the typed AI client (satisfy validation >= 1)
builder.Services.PostConfigure<HttpStandardResilienceOptions>("IGenerativeTextClient-standard", o =>
{
    if (o.Retry.MaxRetryAttempts < 1)
        o.Retry.MaxRetryAttempts = 1;
});

// --- AI News (Gemini + hosted services) ---
builder.Services.AddAiNews(o =>
{
    o.DefaultLang = "en-US";
    o.DefaultCountry = "US";
    // Prefer custom key from API:Key2 (env API__key2), then AiNews/other fallbacks
    o.ApiKey = builder.Configuration["API:Key2"]
               ?? Environment.GetEnvironmentVariable("API__key2")
               ?? builder.Configuration["AiNews:ApiKey"]
               ?? Environment.GetEnvironmentVariable("AiNews__ApiKey")
               ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

    if (string.IsNullOrWhiteSpace(o.ApiKey))
        throw new InvalidOperationException("AiNews:ApiKey is missing. Set it in configuration or as an environment variable.");

    // Allow overriding model/temperature via API section if provided
    var model = builder.Configuration["API:Model"] ?? builder.Configuration["AiNews:Model"];
    if (!string.IsNullOrWhiteSpace(model)) o.Model = model;
    if (double.TryParse(builder.Configuration["API:Temperature"], out var temp))
        o.Creativity = temp;

    o.MinWordCount = 180;            // still decent length
    o.PreInsertMinWordCount = 90;    // forgiving first gate
    o.FillMissingHtml = true;
    o.UseExternalImages = false;     // keep things simple/stable
});

// --- AI Global Rate Limiter Configuration ---
{
    int rpm = 10;
    int minSpacing = 5;
    int cooldownOn429 = 600; // default 10 minutes cooldown after 429
    if (int.TryParse(builder.Configuration["AI:RequestsPerMinute"], out var cfgRpm) && cfgRpm > 0) rpm = cfgRpm;
    if (int.TryParse(builder.Configuration["AI:MinSpacingSeconds"], out var cfgMs) && cfgMs > 0) minSpacing = cfgMs;
    if (int.TryParse(builder.Configuration["AI:CooldownOn429Seconds"], out var cfgCd) && cfgCd > 0) cooldownOn429 = cfgCd;

    Northeast.Services.AiGlobalRateLimiter.Configure(
        requestsPerMinute: rpm,
        minSpacing: TimeSpan.FromSeconds(minSpacing),
        cooldownOn429: TimeSpan.FromSeconds(cooldownOn429));
}

// --- Authentication ---
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;
    options.Cookie.HttpOnly = true;
    options.Cookie.Domain = ".90stimes.com";

    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        },
        OnRedirectToAccessDenied = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        }
    };
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            context.Token = context.Request.Cookies["JwtToken"];
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var raw = context.HttpContext.Request.Cookies["JwtToken"];
            var record = await db.IdTokens.FirstOrDefaultAsync(t => t.Token == raw);
            if (record == null || record.IsRevoked || record.ExpiryDate <= DateTime.UtcNow)
            {
                context.Fail("Token revoked or expired");
            }
        }
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Google:ClientId"];
    options.ClientSecret = builder.Configuration["Google:ClientSecret"];
    options.CallbackPath = "/api/GoogleSignIn/google-response";
    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
});

// --- Authorization ---
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "SuperAdmin"));
    options.AddPolicy("SuperAdminOnly", policy => policy.RequireRole("SuperAdmin"));
});

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddPolicy(originsPolicy, policy =>
    {
        policy.WithOrigins(
            "https://www.90stimes.com",
            "https://90stimes.com",
            "http://localhost:3000"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// --- Forwarded Headers (NGINX) ---
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.ForwardLimit = 2;
});

var dataProtection = builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("/keys"));
var certPath = "/certs/dp-protect.pfx";
var certPwd = builder.Configuration["DP_CERT_PASSWORD"];
if (File.Exists(certPath) && !string.IsNullOrEmpty(certPwd))
{
    var cert = new X509Certificate2(certPath, certPwd,
        X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.EphemeralKeySet);
    dataProtection.ProtectKeysWithCertificate(cert);
}

var app = builder.Build();

// --- DB migrations ---
await app.Services.ApplyMigrationsAsync();

// --- Seed SuperAdmin (optional) ---
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var email = builder.Configuration["SuperAdmin:Email"];
    var password = builder.Configuration["SuperAdmin:Password"];
    if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(password))
    {
        if (!context.Users.Any(u => u.Role == Role.SuperAdmin))
        {
            var superAdmin = new User
            {
                Id = Guid.NewGuid(),
                UserName = "SuperAdmin",
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                Role = Role.SuperAdmin,
                isVerified = true
            };
            context.Users.Add(superAdmin);
            context.SaveChanges();
        }
    }
}

// --- Pipeline ---
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => { c.OAuthUsePkce(); });
}

app.UseCookiePolicy(new CookiePolicyOptions
{
    MinimumSameSitePolicy = SameSiteMode.None,
    Secure = CookieSecurePolicy.SameAsRequest
});

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors(originsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
