using MaxMind.GeoIP2;
using Northeast.Clients;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.DataProtection;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.EntityFrameworkCore;
using System.Net;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using Northeast.Services;
using Northeast.Services.Similarity;
using Northeast.Data;
using Northeast.Interface;
using Northeast.Middlewares;
using Northeast.Repository;
using Northeast.Utilities;
using System.Text;
using System.IO;
using System.Text.Json.Serialization;
using Northeast.Models;
using Microsoft.AspNetCore.Authentication;            // optional
using System.Threading.Tasks;                        // for Task

var builder = WebApplication.CreateBuilder(args);
var originsPolicy = "AuthorizedApps";

// --- Add Services ---
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- DbContext ---
builder.Services.AddDbContext<AppDbContext>();

builder.Services.Configure<HostOptions>(options =>
{
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

// --- Register Application Services ---
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
builder.Services.AddHttpClient();
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
builder.Services.AddOptions<GeminiOptions>()
    .Bind(builder.Configuration.GetSection("Gemini"))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<GeminiOptions>, GeminiOptionsValidator>();
builder.Services.AddHttpClient<GeminiClient>()
    .AddStandardResilienceHandler(o =>
    {
        o.Retry.ShouldHandle = args =>
            ValueTask.FromResult(
                args.Outcome.Exception is HttpRequestException ||
                (args.Outcome.Result?.StatusCode is >= HttpStatusCode.InternalServerError));
        o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
    });
builder.Services.AddHttpClient<NewsRssClient>(client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; NewsBot/1.0)");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8");
})
    .AddStandardResilienceHandler(o =>
    {
        o.Retry.MaxRetryAttempts = 3;
        o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
    });
builder.Services.AddScoped<Deduplication>();
builder.Services.AddScoped<AuthorResolver>();
builder.Services.AddScoped<ArticleFactory>();
builder.Services.AddAiNews(o =>
{
    o.ApiKey = builder.Configuration["AiNews:ApiKey"]
               ?? Environment.GetEnvironmentVariable("AiNews__ApiKey")
               ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    o.Model = builder.Configuration["AiNews:Model"] ?? "gemini-2.5-pro";
    o.TrendingInterval = TimeSpan.FromMinutes(10);
    o.RandomInterval = TimeSpan.FromMinutes(10);
    o.MaxTrendingPerTick = 3;
    o.Creativity = 0.9;
    o.MinWordCount = 260;

    if (string.IsNullOrWhiteSpace(o.ApiKey))
        throw new InvalidOperationException("AiNews:ApiKey is missing. Set it in configuration or as an environment variable.");
});

// --- Configure Authentication ---
builder.Services.AddAuthentication(options =>
{
    // Default to JWT for API requests and use cookies to persist tokens.
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    // Important for cross-site flows: allow cross-site cookies
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.None
        : CookieSecurePolicy.Always;

    // Prevent redirects on API routes (return 401/403 instead)
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

    // Optionally read JWT from a cookie named "JwtToken"
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

// --- Forwarded Headers (trust NGINX) ---
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // Trust forwarded headers from any proxy in front of the app.
    // The reverse proxy is responsible for sanitizing the headers.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.ForwardLimit = 2; // defensive cap on the number of entries
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

// Ensure database is up to date on startup
await app.Services.ApplyMigrationsAsync();

// Seed a SuperAdmin user if credentials are provided
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
// Must be BEFORE HttpsRedirection/Auth so the app sees the original scheme/host.
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.OAuthUsePkce();
    });
}

app.UseCookiePolicy(new CookiePolicyOptions
{
    MinimumSameSitePolicy = SameSiteMode.None,
    Secure = CookieSecurePolicy.Always
});

app.UseHttpsRedirection();

app.UseRouting();

// CORS before auth so 401/403 still include CORS headers
app.UseCors(originsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await app.RunAsync();
