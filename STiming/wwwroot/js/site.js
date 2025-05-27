$(document).ready(function () {
    console.log("Document is ready. Initializing application.");

    let currentActiveTab = 'home';
    let liveTimers = {};

    const dataFiles = {
        tab1: 'fajr.csv',
        tab2: 'dhuhr.csv',
        tab6: 'jumah.csv',
        tab3: 'asr.csv',
        tab4: 'maghrib.csv',
        tab5: 'isha.csv'
    };

    const salahNames = {
        tab1: 'Fajr',
        tab2: 'Dhuhr',
        tab6: 'Jumah',
        tab3: 'Asr',
        tab4: 'Maghrib',
        tab5: 'Isha'
    };

    let tabData = {};

    // Function to get or create a unique guest ID
    function getOrCreateGuestId() {
        let guestId = localStorage.getItem('guestId');
        if (!guestId) {
            guestId = 'guest_' + Date.now() + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('guestId', guestId);
            console.log("Generated new guestId:", guestId);
        } else {
            console.log("Retrieved existing guestId:", guestId);
        }
        return guestId;
    }

    // Function to get the current logged-in user ID from the DOM
    function getLoggedInUserIdFromDom() {
        const $loggedInUserSpan = $('#logged-in-user');
        if ($loggedInUserSpan.length > 0) {
            const text = $loggedInUserSpan.text();
            // Expected format: "Logged in as: admin" or "Logged in as: someuser"
            const match = text.match(/Logged in as: (.+)/i);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null; // Return null if not found or not in expected format
    }

    // Function to determine if the current user is an admin
    function isAdminUser() {
        const isAuthenticated = $('#auth-status #logout-btn').length > 0;
        if (!isAuthenticated) {
            console.log("isAdminUser: Not authenticated, returning false.");
            return false;
        }

        const userId = getLoggedInUserIdFromDom();
        const isAdmin = userId === 'admin'; // Check if the extracted userId is 'admin'
        console.log("isAdminUser: Authenticated. userId:", userId, "Is Admin:", isAdmin);
        return isAdmin;
    }

    function showToast(message, type = 'info') {
        const toastContainer = $('#toast-container');
        if (toastContainer.length === 0) {
            console.warn("Toast container not found. Cannot display toast:", message);
            return;
        }

        const toast = $(`<div class="toast-message ${type}">${message}</div>`);
        toastContainer.append(toast);

        toast.css({
            'display': 'flex',
            'opacity': '1'
        });

        setTimeout(() => {
            toast.fadeOut(300, function () {
                $(this).remove();
            });
        }, 3000);
    }

    function parseTime(timeString, tabId) {
        const parts = timeString.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!parts) {
            console.warn("Failed to parse time string:", timeString);
            return null;
        }
        let hours = parseInt(parts[1], 10);
        const minutes = parseInt(parts[2], 10);
        const ampm = parts[3].toLowerCase();

        if (ampm === 'pm' && hours !== 12) {
            hours += 12;
        } else if (ampm === 'am' && hours === 12) {
            hours = 0;
        }

        const now = new Date();
        let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

        if (tabId === 'tab6') { // Specific logic for Jumah (Friday) prayers
            const todayDay = now.getDay(); // 0 for Sunday, 5 for Friday
            const fridayDay = 5;

            if (todayDay === fridayDay) {
                // If today is Friday, check if target time is in the past
                if (targetDate < now) {
                    targetDate.setDate(targetDate.getDate() + 7); // Move to next Friday
                }
            } else {
                // If not Friday, calculate days until next Friday
                let daysUntilFriday = fridayDay - todayDay;
                if (daysUntilFriday < 0) {
                    daysUntilFriday += 7; // Wrap around to next week if day is already passed
                }
                targetDate.setDate(targetDate.getDate() + daysUntilFriday);
            }
        }
        else { // For daily prayers, if time is in the past, assume next day
            if (targetDate < now) {
                targetDate.setDate(targetDate.getDate() + 1);
            }
        }

        return targetDate;
    }

    function formatTimeLeft(targetTime) {
        if (!targetTime) return "Invalid Time";
        const now = new Date();
        let diff = targetTime.getTime() - now.getTime();

        if (diff < 0) {
            return "Time Passed";
        }

        const oneDayInMs = 24 * 60 * 60 * 1000;

        const days = Math.floor(diff / oneDayInMs);
        let remainingDiff = diff % oneDayInMs;

        const hours = Math.floor(remainingDiff / (1000 * 60 * 60));
        remainingDiff %= (1000 * 60 * 60);

        const minutes = Math.floor(remainingDiff / (1000 * 60));
        const seconds = Math.floor((remainingDiff % (1000 * 60)) / 1000);

        let formattedString = '';
        if (days > 0) {
            formattedString += `${days}d `;
        }
        formattedString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        return formattedString;
    }

    function updateTimeLeft(tabId) {
        const $table = $(`#${tabId}-table`);
        if ($table.length === 0) {
            // console.warn(`Table #${tabId}-table not found for time update.`);
            return;
        }
        $table.find('tbody tr').each(function () {
            const $row = $(this);
            const timeString = $row.find('td[data-time]').data('time');
            const targetTime = parseTime(timeString, tabId);
            const timeLeftCell = $row.find('.time-left');

            if (timeLeftCell.length > 0) {
                const formattedTime = formatTimeLeft(targetTime);
                timeLeftCell.text(formattedTime);

                const now = new Date();
                let diffInHours = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                $row.removeClass('past-time upcoming-time less-than-30-minutes');
                if (formattedTime === "Time Passed") {
                    $row.addClass('past-time');
                } else if (formattedTime === "Invalid Time") {
                    // No specific class for invalid time, keep default row style
                } else {
                    $row.addClass('upcoming-time');
                    if (diffInHours > 0 && diffInHours < 0.5) {
                        $row.addClass('less-than-30-minutes');
                    }
                }
            }
        });
    }

    function sortTable(tableId, tabIdForSorting) {
        const $table = $(tableId);
        if ($table.length === 0) {
            console.warn(`Table ${tableId} not found for sorting.`);
            return;
        }
        const rows = $table.find('tbody tr').get();

        rows.sort(function (a, b) {
            const timeA = $(a).find('td[data-time]').data('time');
            const timeB = $(b).find('td[data-time]').data('time');

            const dateA = parseTime(timeA, tabIdForSorting);
            const dateB = parseTime(timeB, tabIdForSorting);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1; // If A is invalid, B comes first
            if (!dateB) return -1; // If B is invalid, A comes first

            return dateA.getTime() - dateB.getTime();
        });

        $.each(rows, function (index, row) {
            $table.children('tbody').append(row);
        });
    }

    function displayTable(tabId, data) {
        const tableId = `#${tabId}-table`;
        const $table = $(tableId);
        $table.empty(); // Clear existing content

        if (!data || data.length === 0) {
            $table.append('<tr><td colspan="5">No timings available.</td></tr>');
            return;
        }

        const headers = ['Time Left', 'Time', 'Masjid Name', 'Location'];
        let thead = '<thead><tr>';
        headers.forEach(header => {
            thead += `<th>${header}</th>`;
        });
        if ($('#auth-status #logout-btn').length > 0) {
            thead += '<th>Actions</th>';
        }
        thead += '</tr></thead>';
        $table.append(thead);

        let tbody = '<tbody>';
        data.forEach((item, index) => {
            const mapUrl = item.mapUrl && item.mapUrl.startsWith('http') ? item.mapUrl : '#';
            const locationButtonHtml = mapUrl !== '#' ?
                `<button class="view-location-btn" data-map-url="${mapUrl}">${item.location}</button>` :
                `<span>${item.location}</span>`;

            const initialTimeLeftStatus = formatTimeLeft(parseTime(item.time, tabId));
            const rowClass = initialTimeLeftStatus === 'Time Passed' ? 'past-time' : (initialTimeLeftStatus === 'Invalid Time' ? '' : 'upcoming-time');

            tbody += `<tr class="${rowClass}">
                        <td class="time-left">${initialTimeLeftStatus}</td>
                        <td data-time="${item.time}">${item.time}</td>
                        <td>${item.title}</td>
                        <td>${locationButtonHtml}</td>`;
            if ($('#auth-status #logout-btn').length > 0) {
                tbody += `<td><button class="edit-btn" data-index="${index}" data-tab="${tabId}">Edit</button></td>`;
            }
            tbody += '</tr>';
        });
        tbody += '</tbody>';
        $table.append(tbody);

        // Clear any existing interval for this tab before setting a new one
        if (liveTimers[tabId]) {
            clearInterval(liveTimers[tabId]);
        }
        liveTimers[tabId] = setInterval(() => updateTimeLeft(tabId), 1000);

        sortTable(tableId, tabId);
    }

    function loadTabData(tabId) {
        console.log("Loading data for tab:", tabId);
        const fileName = dataFiles[tabId];
        if (!fileName) {
            $(`#${tabId}-content .table-responsive table`).html('<tr><td colspan="5">Configuration error: Tab data file not found.</td></tr>');
            showContentArea(`${tabId}-content`);
            showToast(`Configuration error: Tab data file not found for ${tabId}.`, 'error');
            return;
        }

        $.get(`/api/Data/GetTimings?tabName=${fileName}`, function (data) {
            console.log(`Data loaded successfully for ${tabId}:`, data);
            tabData[tabId] = data;
            displayTable(tabId, data);
            showContentArea(`${tabId}-content`);
            currentActiveTab = tabId;
            // Re-enabled logging for viewing a tab
            logUserActivity('View Tab', `${salahNames[tabId]} tab viewed`);
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error(`Failed to load data for ${tabId}:`, textStatus, errorThrown, jqXHR.responseText);
            $(`#${tabId}-content .table-responsive table`).html('<tr><td colspan="5">Failed to load data. Please check server logs.</td></tr>');
            showContentArea(`${tabId}-content`);
            showToast(`Failed to load ${salahNames[tabId]} data.`, 'error');
        });
    }

    function showContentArea(pageId) {
        console.log("Showing content area:", pageId);
        $('.content-section').hide(); // Hide all content sections
        $(`#${pageId}`).show(); // Show the requested content section

        $('#main-nav ul li a').removeClass('active'); // Remove active class from all nav links
        if (pageId.startsWith('tab')) {
            $(`nav#main-nav ul li a[data-tab="${pageId.replace('-content', '')}"]`).addClass('active');
            currentActiveTab = pageId.replace('-content', '');
        } else if (pageId === 'home-page') {
            $(`nav#main-nav ul li a[data-tab="home"]`).addClass('active');
            currentActiveTab = 'home';
        } else if (pageId === 'activity-log-content') {
            $(`nav#main-nav ul li a[data-tab="activity-log"]`).addClass('active');
            currentActiveTab = 'activity-log';
        } else {
            currentActiveTab = null;
        }
    }

    // Function to log user activity to the backend
    function logUserActivity(activityType, details) {
        const isAuthenticated = $('#auth-status #logout-btn').length > 0;
        let userId;
        let userStatus;

        if (isAuthenticated) {
            userId = getLoggedInUserIdFromDom(); // Get user ID from the span
            if (!userId) {
                console.warn("Authenticated user ID not found in #logged-in-user span. Logging as 'authenticated_unknown'.");
                userId = 'authenticated_unknown';
            }
            userStatus = 'Authenticated';
        } else {
            userId = getOrCreateGuestId();
            userStatus = 'Guest';
        }

        // Only log activity if the user is a guest
        if (userStatus === 'Authenticated') {
            console.log("Skipping activity log for authenticated user:", userId, activityType);
            return; // Do not log for authenticated users
        }

        $.ajax({
            url: '/api/Activity/Log', // Your C# backend API endpoint
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                userId: userId,
                activityType: activityType,
                details: details,
                userStatus: userStatus // Include user status in log
            }),
            success: function () {
                // console.log('Activity logged successfully:', activityType, details); // Keep silent for successful logs
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('Failed to log activity:', textStatus, errorThrown, jqXHR.responseText);
            }
        });
    }

    // Function to load and display the activity log
    function loadActivityLog() {
        console.log("Attempting to load activity log.");
        if (!isAdminUser()) {
            showToast("You must be logged in as an admin to view the activity log.", 'warning');
            showContentArea('home-page'); // Redirect to home if not admin
            console.log("User is not admin, redirecting to home page.");
            return;
        }

        const $activityTableBody = $('#activity-log-table tbody');
        const $activityRowCount = $('#activity-row-count');
        const $activityTotalCount = $('#activity-total-count'); // New span for total count

        $activityTableBody.empty().append('<tr><td colspan="4">Loading activity log...</td></tr>');
        $activityRowCount.text('Loading...');
        $activityTotalCount.text('Loading...'); // Update new span


        $.get('/api/Activity/GetLog', function (data) {
            console.log("Activity log data received:", data);
            $activityTableBody.empty();

            // Display overall total count before filtering
            $activityTotalCount.text(`Total records: ${data.length}`);

            // Calculate the date 5 days ago
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            fiveDaysAgo.setHours(0, 0, 0, 0); // Set to start of the day

            // Filter data for the last 5 days
            const filteredData = data.filter(activity => {
                const activityTimestamp = new Date(activity.timestamp);
                return activityTimestamp >= fiveDaysAgo;
            });

            if (filteredData && filteredData.length > 0) {
                filteredData.forEach(activity => {
                    const timestamp = new Date(activity.timestamp).toLocaleString();
                    $activityTableBody.append(`
                        <tr>
                            <td>${timestamp}</td>
                            <td>${activity.userId || 'N/A'}</td>
                            <td>${activity.activityType}</td>
                            <td>${activity.details}</td>
                        </tr>
                    `);
                });
                $activityRowCount.text(`Total entries (last 5 days): ${filteredData.length}`); // Set total count for filtered data
            } else {
                $activityTableBody.append('<tr><td colspan="4">No activities logged in the last 5 days.</td></tr>');
                $activityRowCount.text('Total entries (last 5 days): 0'); // Set total count to 0 for filtered data
            }
            showContentArea('activity-log-content');
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.error('Failed to load activity log:', textStatus, errorThrown, jqXHR.responseText);
            $activityTableBody.empty().append('<tr><td colspan="4">Failed to load activity log. Please ensure you are logged in as admin and the backend API is running.</td></tr>');
            $activityRowCount.text('Error loading log.');
            $activityTotalCount.text('Error loading log.'); // Update new span on error
            showToast('Failed to load activity log. Access denied or server error.', 'error');
            showContentArea('home-page'); // Redirect to home on error
        });
    }


    // Event listener for main navigation tabs
    $('#main-nav ul li a').on('click', function (event) {
        event.preventDefault(); // Prevent default link behavior
        const tabId = $(this).data('tab');
        console.log("Nav tab clicked:", tabId);

        if (tabId === 'home') {
            showContentArea('home-page');
            // Re-enabled logging for Home page view
            logUserActivity('View Page', 'Home page viewed');
        } else if (tabId === 'activity-log') {
            loadActivityLog();
            // Re-enabled logging for Activity Log page view
            logUserActivity('View Page', 'Activity Log page viewed');
        }
        else {
            showContentArea(`${tabId}-content`);
            loadTabData(tabId);
        }
    });

    // Event listener for grid items on home page
    $('.grid-item').on('click', function () {
        const tabId = $(this).data('tab-link');
        if (tabId) {
            console.log("Grid item clicked:", tabId);
            showContentArea(`${tabId}-content`);
            loadTabData(tabId);
            // Re-enabled logging for Grid Item Click
            logUserActivity('Grid Item Click', `Clicked grid item for ${salahNames[tabId] || tabId}`);
        }
    });

    // Event listener for edit buttons within tables
    $(document).on('click', '.edit-btn', function () {
        console.log("Edit button clicked.");
        if ($('#auth-status #logout-btn').length === 0) {
            showToast("You must be logged in to edit timings.", 'warning');
            return;
        }

        const rowIndex = $(this).data('index');
        const tabId = $(this).data('tab');

        if (!tabData[tabId] || !tabData[tabId][rowIndex]) {
            showToast("Error: Data for editing not found.", 'error');
            console.error("Data for editing not found. tabId:", tabId, "rowIndex:", rowIndex);
            return;
        }

        const itemToEdit = tabData[tabId][rowIndex];

        populateTimeDropdowns();

        const salahName = salahNames[tabId] || "Salah";
        $('#edit-modal-title').text(`Edit ${salahName} Timing`);

        const timeParts = itemToEdit.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeParts) {
            let hour = parseInt(timeParts[1], 10);
            const minute = parseInt(timeParts[2], 10);
            const ampm = timeParts[3].toUpperCase();

            let displayHour = String(hour);
            if (hour === 0) displayHour = '12';
            else if (hour > 12) displayHour = String(hour - 12);

            displayHour = displayHour.padStart(2, '0');

            // Using a direct selection method for robustness
            // Use a small timeout to ensure options are rendered before setting value
            setTimeout(() => {
                $('#edit-time-hour').val(displayHour);
                $('#edit-time-minute').val(String(minute).padStart(2, '0'));
                $('#edit-time-ampm').val(ampm);
            }, 50); // Increased timeout slightly for robustness

        } else {
            console.warn("Could not parse time for editing:", itemToEdit.time);
            $('#edit-time-hour').val('');
            $('#edit-time-minute').val('');
            $('#edit-time-ampm').val('');
        }

        $('#edit-srno').val(itemToEdit.srNo);
        $('#edit-title').val(itemToEdit.title);

        $('#edit-location').val(itemToEdit.location);
        $('#edit-map-url').val(itemToEdit.mapUrl || '');

        $('#edit-tab-id').val(tabId);
        $('#edit-row-index').val(rowIndex);

        // Add the 'show' class to the modal to make it visible and interactive
        $('#edit-modal').addClass('show');
        console.log("Edit modal shown for item:", itemToEdit);
    });

    // Close button for the modal
    $('.close-button').on('click', function () {
        console.log("Close button clicked, hiding modal.");
        $('#edit-modal').removeClass('show'); // Remove 'show' class to hide modal
    });

    // Click outside modal to close
    $(window).on('click', function (event) {
        if ($(event.target).is('#edit-modal')) {
            console.log("Clicked outside modal, hiding modal.");
            $('#edit-modal').removeClass('show'); // Remove 'show' class to hide modal
        }
    });

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Save edited timings button click
    $('#save-edit-btn').on('click', function () {
        console.log("Save edit button clicked.");
        const tabId = $('#edit-tab-id').val();
        const rowIndex = $('#edit-row-index').val();

        const newTitle = $('#edit-title').val();
        const selectedHour = $('#edit-time-hour').val();
        const selectedMinute = $('#edit-time-minute').val();
        const selectedAmpm = $('#edit-time-ampm').val();
        const newTime = `${selectedHour}:${selectedMinute} ${selectedAmpm}`;

        const newLocation = $('#edit-location').val();
        const newMapUrl = $('#edit-map-url').val().trim();

        if (!selectedHour || !selectedMinute || !selectedAmpm) {
            showToast('Please select a valid time (Hour, Minute, AM/PM).', 'error');
            console.warn("Validation failed: Time not fully selected.");
            return;
        }

        if (newMapUrl !== '' && !isValidUrl(newMapUrl)) {
            showToast('Please enter a valid URL for the Map URL, or leave it empty.', 'error');
            return;
        }

        if (tabData[tabId] && tabData[tabId][rowIndex]) {
            const oldItem = { ...tabData[tabId][rowIndex] }; // Clone for comparison
            tabData[tabId][rowIndex].title = newTitle;
            tabData[tabId][rowIndex].time = newTime;
            tabData[tabId][rowIndex].location = newLocation;
            tabData[tabId][rowIndex].mapUrl = newMapUrl;

            const fileName = dataFiles[tabId];
            $.ajax({
                url: '/api/Data/SaveTimings',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    TabName: fileName,
                    Timings: tabData[tabId]
                }),
                success: function (response) {
                    console.log("Timings saved successfully on server.", response);
                    displayTable(tabId, tabData[tabId]); // Re-display table to reflect changes
                    $('#edit-modal').removeClass('show'); // Remove 'show' class to hide modal
                    showToast('Timings saved successfully on the server!', 'success');
                    // Re-enabled logging for editing timing
                    logUserActivity('Edit Timing', `Edited ${salahNames[tabId]} timing for "${oldItem.title}" from "${oldItem.time}" to "${newTime}"`);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error('Failed to save data to server:', textStatus, errorThrown, jqXHR.responseText);
                    if (jqXHR.status === 401 || jqXHR.status === 403) {
                        showToast('You are not authorized to save data. Please log in.', 'error');
                    } else {
                        showToast('Failed to save data to server. Please check console for details.', 'error');
                    }
                }
            });

        } else {
            showToast('Error: Could not find data to update in memory.', 'error');
            console.error('Error: Could not find data to update in memory. tabId:', tabId, "rowIndex:", rowIndex);
        }
    });

    // Event listener for view location buttons
    $(document).on('click', '.view-location-btn', function () {
        const mapUrl = $(this).data('map-url');
        const buttonText = $(this).text(); // Get the text content of the button
        console.log("View location button clicked. Map URL:", mapUrl, "Button Text:", buttonText);
        if (mapUrl && mapUrl !== '#') {
            window.open(mapUrl, '_blank');
            logUserActivity('View Map', `Viewed map for location: ${buttonText}`); // Log button text
        } else {
            showToast('No valid map URL available for this location.', 'info');
            logUserActivity('View Map', `Attempted to view map for location: ${buttonText} but no valid URL was available`); // Log button text
        }
    });

    function populateTimeDropdowns() {
        const hourSelect = $('#edit-time-hour');
        const minuteSelect = $('#edit-time-minute');
        const ampmSelect = $('#edit-time-ampm');

        // Clear existing options
        hourSelect.empty();
        minuteSelect.empty();
        ampmSelect.empty();

        // Add default placeholder options
        hourSelect.append($('<option>', { value: '', text: 'Hour', disabled: true, selected: true }));
        minuteSelect.append($('<option>', { value: '', text: 'Min', disabled: true, selected: true }));
        ampmSelect.append($('<option>', { value: '', text: 'AM/PM', disabled: true, selected: true }));

        // Populate hours (1-12)
        for (let i = 1; i <= 12; i++) {
            hourSelect.append($('<option>', {
                value: String(i).padStart(2, '0'),
                text: String(i).padStart(2, '0')
            }));
        }

        // Populate minutes (0-59)
        for (let i = 0; i <= 59; i++) {
            minuteSelect.append($('<option>', {
                value: String(i).padStart(2, '0'),
                text: String(i).padStart(2, '0')
            }));
        }

        // Populate AM/PM
        ampmSelect.append($('<option>', { value: 'AM', text: 'AM' }));
        ampmSelect.append($('<option>', { value: 'PM', text: 'PM' }));
        console.log("Time dropdowns populated.");
    }

    // Initial application setup logic
    // This block runs once the DOM is ready
    if ($('#content').length > 0) {
        console.log("Main content area found. Initializing display.");
        $('.content-section').hide(); // Hide all content sections initially

        const isAuthenticated = $('#auth-status #logout-btn').length > 0;
        console.log("Is Authenticated:", isAuthenticated);

        // Conditionally show/hide activity log tab based on admin status
        const activityLogNavItem = $('nav#main-nav ul li a[data-tab="activity-log"]').parent(); // Get the parent <li>
        if (isAdminUser()) {
            activityLogNavItem.show();
            console.log("Activity Log tab shown (user is admin).");
        } else {
            activityLogNavItem.hide();
            console.log("Activity Log tab hidden (user is not admin).");
        }

        // Determine which content area to show on initial load
        if (isAuthenticated) {
            showContentArea('home-page');
            $('#main-nav').show();
            $('nav#main-nav ul li a[data-tab="home"]').addClass('active');
            // Re-enabled logging for Login and home page load
            logUserActivity('Login', 'User logged in and home page loaded');
        } else {
            showContentArea('home-page');
            $('#main-nav').show();
            $('nav#main-nav ul li a[data-tab="home"]').addClass('active');
            // Re-enabled logging for Anonymous Access and home page load
            logUserActivity('Anonymous Access', 'Home page loaded for anonymous user');
        }
    } else if ($('#login-page').length > 0) {
        console.log("Login page found. Hiding main nav and auth status.");
        $('#main-nav').hide();
        $('#auth-status').hide();
        // Re-enabled logging for Login page view
        logUserActivity('View Page', 'Login page viewed');
    }

    // Populate time dropdowns on page load, even if modal isn't open yet
    populateTimeDropdowns();
});
