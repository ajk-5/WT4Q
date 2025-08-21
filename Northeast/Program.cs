using Microsoft.AspNetCore.Authentication.Cookies;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;

using Microsoft.IdentityModel.Tokens;
using Northeast.Data;
using Northeast.Interface;

using Northeast.Models;
using Northeast.Repository;
using Northeast.Services;
using Northeast.Services.Similarity;
using Northeast.Utilities;
using Polly.Timeout;                        // ✅ Polly timeout

using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
                   // ✅ Timeout.InfiniteTimeSpan

var builder = WebApplication.CreateBuilder(args);
var originsPolicy = "AuthorizedApps";

// --- Add Services ---
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
builder.Services.AddScoped<CocktailService>();
builder.Services.AddScoped<GenerateJwt>();
builder.Services.AddScoped<GetConnectedUser>();
builder.Services.AddScoped<OTPservices>();
builder.Services.AddTransient<SendEmail>();
builder.Services.AddScoped<SiteVisitorServices>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient(); // generic (no special policies)
builder.Services.AddMemoryCache();
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

// --- HTTP clients with resilience (named "default") ---
builder.Services.AddHttpClient("default")
    .ConfigureHttpClient(c =>
    {
        c.Timeout = Timeout.InfiniteTimeSpan; // ✅ Polly owns timeouts
    })
    .AddStandardResilienceHandler(o =>
    {
        // Timeouts
        o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(60);
        o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(150);

        // Circuit breaker rule: SamplingDuration >= 2 × AttemptTimeout
        o.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(2); // ✅ >= 120s
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

// --- AI News (Gemini + hosted services) ---
builder.Services.AddAiNews(o =>
{
    o.ApiKey = builder.Configuration["AiNews:ApiKey"]
               ?? Environment.GetEnvironmentVariable("AiNews__ApiKey")
               ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

    if (string.IsNullOrWhiteSpace(o.ApiKey))
        throw new InvalidOperationException("AiNews:ApiKey is missing. Set it in configuration or as an environment variable.");

    o.MinWordCount = 150;            // still decent length
    o.PreInsertMinWordCount = 80;    // forgiving first gate
    o.FillMissingHtml = true;
    o.AcceptStaleAsAnalysis = true;  // turns “too old” into analysis (non-breaking)
    o.UseExternalImages = false;     // keep things simple/stable
});

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
            "https://www.wt4q.com",
            "https://wt4q.com",
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
    Secure = CookieSecurePolicy.Always
});

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors(originsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
