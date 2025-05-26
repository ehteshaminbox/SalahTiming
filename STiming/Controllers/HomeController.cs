using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using SalahTimingsApp.Models;
using STiming.Models; // Ensure this is included

namespace SalahTimingsApp.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        // This action will serve your main single-page application
        public IActionResult Index()
        {
            // The client-side JS will handle showing the home page grid or login form
            // based on URL params, and then fetch data via DataController.
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}