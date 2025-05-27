using Microsoft.AspNetCore.Authentication.Cookies;

using SalahTimingsApp.Services;
using STiming.Services; // Make sure to include this namespace

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Register FileManager for dependency injection
// This tells the DI container how to create an instance of FileManager
// Scoped: A new instance is created once per client request (HTTP request).
builder.Services.AddScoped<FileManager>();
builder.Services.AddSingleton<ActivityLogger>(); // Register as a singleton
builder.Services.AddControllers();

// Configure Cookie Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login"; // Path to your login action
        options.LogoutPath = "/Account/Logout"; // Path to your logout action
        options.AccessDeniedPath = "/Home/Index"; // Redirect if unauthorized
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30); // Cookie expiration
        options.SlidingExpiration = true; // Renew cookie if half expired
    });

// Add Authorization services
builder.Services.AddAuthorization();


var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // Enables serving static files from wwwroot

app.UseRouting();

// Add authentication and authorization middleware
app.UseAuthentication(); // Must be before UseAuthorization
app.UseAuthorization();

// Custom route for /login
app.MapControllerRoute(
    name: "login_shortcut",
    pattern: "login", // The URL path you want to use
    defaults: new { controller = "Account", action = "Login" } // The controller and action it maps to
);

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
