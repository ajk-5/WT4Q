using MaxMind.GeoIP2;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using Northeast.Services;
using Northeast.Data;
using Northeast.Interface;
using Northeast.Middlewares;
using Northeast.Repository;
using Northeast.Utilities;
using System.Text;
using System.Text.Json.Serialization;
using Northeast.Models;

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

// --- Configure Authentication ---
builder.Services.AddAuthentication(options =>
{
    // Default to JWT for API requests and use cookies to persist tokens.
    // Avoid redirecting API calls to Google when not authenticated.
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    // Important for external OAuth flows: allow cross-site cookies
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ?
        CookieSecurePolicy.None : CookieSecurePolicy.Always;
})
.AddJwtBearer(options =>
{
    // Basic JWT settings
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
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
    // Pull from appsettings or user-secrets
    options.ClientId = builder.Configuration["Google:ClientId"];
    options.ClientSecret = builder.Configuration["Google:ClientSecret"];

    // Must match exactly what's in Google Cloud Console "Authorized redirect URI"
    // Using a single endpoint: /api/GoogleSignIn/google-auth
    options.CallbackPath = "/api/GoogleSignIn/google-response";

    // Store external login info in the same cookie scheme
    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
});

// --- Configure Authorization ---
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "SuperAdmin"));
    options.AddPolicy("SuperAdminOnly", policy => policy.RequireRole("SuperAdmin"));
});

// --- Configure CORS ---
builder.Services.AddCors(options =>
{
    options.AddPolicy(originsPolicy, policy =>
    {
        policy.WithOrigins("https://localhost:7122", "http://localhost:3000", "https://localhost:3000", "http://localhost:3001", "https://localhost:3001")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// --- Configure Forwarded Headers (if behind a proxy) ---
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedProto
                             | ForwardedHeaders.XForwardedHost;
});

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

// --- Middleware Pipeline ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        // Note: Social login flows often fail if tested inside Swagger UI
        c.OAuthUsePkce();
    });
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Enforce global cookie policy (SameSite=None, Secure in production)
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
