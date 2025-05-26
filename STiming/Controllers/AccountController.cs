using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;

using SalahTimingsApp.Models;
using SalahTimingsApp.Services;

using System.Security.Claims;

namespace SalahTimingsApp.Controllers
{
    public class AccountController : Controller
    {
        private readonly FileManager _fileManager;
        private readonly ILogger<AccountController> _logger;

        public AccountController(FileManager fileManager, ILogger<AccountController> logger)
        {
            _fileManager = fileManager;
            _logger = logger;
        }

        
        [HttpGet]
        public IActionResult Login()
        {
            // This view will contain the login form
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(string username, string password, string returnUrl = null)
        {
            _logger.LogInformation($"Login attempt for user: {username}");
            var users = await _fileManager.ReadUsersAsync();
            var user = users.FirstOrDefault(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase) && u.Password == password);

            if (user != null)
            {
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, "Admin") // Assign a role if needed, e.g., "Admin" for editing
                };

                var claimsIdentity = new ClaimsIdentity(
                    claims, CookieAuthenticationDefaults.AuthenticationScheme);

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(claimsIdentity));

                _logger.LogInformation($"User {username} logged in successfully.");

                // Redirect to the main application page or returnUrl
                return RedirectToAction("Index", "Home");
            }
            else
            {
                _logger.LogWarning($"Login failed for user: {username}");
                ModelState.AddModelError(string.Empty, "Invalid login attempt.");
                return View(); // Return to login view with error
            }
        }

        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            _logger.LogInformation($"User {User.Identity.Name} logging out.");
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home"); // Redirect to home page after logout
        }
    }
}