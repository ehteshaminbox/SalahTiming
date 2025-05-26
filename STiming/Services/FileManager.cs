using SalahTimingsApp.Models;

using System.Globalization; // Required for CultureInfo.InvariantCulture

namespace SalahTimingsApp.Services
{
    public class FileManager
    {
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<FileManager> _logger; // Added for logging

        public FileManager(IWebHostEnvironment webHostEnvironment, ILogger<FileManager> logger)
        {
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
        }

        // --- User Management ---

        public async Task<List<User>> ReadUsersAsync()
        {
            var users = new List<User>();
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "data", "users.txt");

            if (!File.Exists(filePath))
            {
                _logger.LogWarning($"Users file not found at: {filePath}. Returning empty user list.");
                return users;
            }

            try
            {
                var lines = await File.ReadAllLinesAsync(filePath);
                foreach (var line in lines)
                {
                    var parts = line.Split(',');
                    if (parts.Length == 2)
                    {
                        users.Add(new User { Username = parts[0].Trim(), Password = parts[1].Trim() });
                    }
                    else
                    {
                        _logger.LogWarning($"Invalid line format in users.txt: {line}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error reading users.txt from {filePath}");
            }
            return users;
        }

        // --- Salah Timings Management ---

        public async Task<List<SalahTiming>> ReadSalahTimingsAsync(string fileName)
        {
            var timings = new List<SalahTiming>();
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "data", fileName);

            if (!File.Exists(filePath))
            {
                _logger.LogWarning($"Salah timings file not found at: {filePath}. Returning empty list.");
                return timings;
            }

            try
            {
                var lines = await File.ReadAllLinesAsync(filePath);
                if (lines.Length <= 1) // Only header or empty file
                {
                    return timings;
                }

                // Assuming header is: sr no,title,time,location,map_url
                // We're skipping the header line (lines[0])
                for (int i = 1; i < lines.Length; i++)
                {
                    var parts = lines[i].Split(',');
                    if (parts.Length == 5) // Ensure correct number of columns
                    {
                        if (int.TryParse(parts[0].Trim(), out int srNo))
                        {
                            timings.Add(new SalahTiming
                            {
                                SrNo = srNo,
                                Title = parts[1].Trim(),
                                Time = parts[2].Trim(),
                                Location = parts[3].Trim(),
                                MapUrl = parts[4].Trim()
                            });
                        }
                        else
                        {
                            _logger.LogWarning($"Invalid SrNo format in {fileName}: {lines[i]}");
                        }
                    }
                    else
                    {
                        _logger.LogWarning($"Invalid column count in {fileName}: {lines[i]}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error reading {fileName} from {filePath}");
            }
            return timings;
        }

        public async Task WriteSalahTimingsAsync(string fileName, List<SalahTiming> timings)
        {
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "data", fileName);
            var lines = new List<string>
            {
                "sr no,title,time,location,map_url" // Header
            };

            foreach (var timing in timings)
            {
                // Ensure no commas in data fields that aren't part of the CSV structure
                // For simplicity, we're not quoting fields here. If your data might contain commas,
                // you'd need to implement proper CSV quoting (e.g., using CsvHelper library).
                lines.Add($"{timing.SrNo},{timing.Title},{timing.Time},{timing.Location},{timing.MapUrl}");
            }

            try
            {
                await File.WriteAllLinesAsync(filePath, lines);
                _logger.LogInformation($"Successfully wrote data to {fileName} at {filePath}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error writing to {fileName} at {filePath}");
                throw; // Re-throw to indicate failure to the caller
            }
        }
    }
}