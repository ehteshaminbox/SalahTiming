$(document).ready(function () {
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

    function showToast(message, type = 'info') {
        const toastContainer = $('#toast-container');
        if (toastContainer.length === 0) {
            alert(message);
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

        if (tabId === 'tab6') {
            const todayDay = now.getDay();
            const fridayDay = 5;

            if (todayDay === fridayDay) {
                if (targetDate < now) {
                    targetDate.setDate(targetDate.getDate() + 7);
                }
            } else {
                let daysUntilFriday = fridayDay - todayDay;
                if (daysUntilFriday < 0) {
                    daysUntilFriday += 7;
                }
                targetDate.setDate(targetDate.getDate() + daysUntilFriday);
            }
        }
        else {
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
        const rows = $table.find('tbody tr').get();

        rows.sort(function (a, b) {
            const timeA = $(a).find('td[data-time]').data('time');
            const timeB = $(b).find('td[data-time]').data('time');

            const dateA = parseTime(timeA, tabIdForSorting);
            const dateB = parseTime(timeB, tabIdForSorting);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return dateA.getTime() - dateB.getTime();
        });

        $.each(rows, function (index, row) {
            $table.children('tbody').append(row);
        });
    }

    function displayTable(tabId, data) {
        const tableId = `#${tabId}-table`;
        $(tableId).empty();

        if (!data || data.length === 0) {
            $(tableId).append('<tr><td colspan="5">No timings available.</td></tr>');
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
        $(tableId).append(thead);

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
        $(tableId).append(tbody);

        if (liveTimers[tabId]) {
            clearInterval(liveTimers[tabId]);
        }
        liveTimers[tabId] = setInterval(() => updateTimeLeft(tabId), 1000);

        sortTable(tableId, tabId);
    }

    function loadTabData(tabId) {
        const fileName = dataFiles[tabId];
        if (!fileName) {
            $(`#${tabId}-content .table-responsive table`).html('<tr><td colspan="5">Configuration error: Tab data file not found.</td></tr>');
            showContentArea(`${tabId}-content`);
            return;
        }

        $.get(`/api/Data/GetTimings?tabName=${fileName}`, function (data) {
            tabData[tabId] = data;
            displayTable(tabId, data);
            showContentArea(`${tabId}-content`);
            currentActiveTab = tabId;
        }).fail(function (jqXHR, textStatus, errorThrown) {
            $(`#${tabId}-content .table-responsive table`).html('<tr><td colspan="5">Failed to load data. Please check server logs.</td></tr>');
            showContentArea(`${tabId}-content`);
        });
    }

    function showContentArea(pageId) {
        $('.content-section').hide();
        $(`#${pageId}`).show();

        $('#main-nav ul li a').removeClass('active');
        if (pageId.startsWith('tab')) {
            $(`nav#main-nav ul li a[data-tab="${pageId.replace('-content', '')}"]`).addClass('active');
            currentActiveTab = pageId.replace('-content', '');
        } else if (pageId === 'home-page') {
            $(`nav#main-nav ul li a[data-tab="home"]`).addClass('active');
            currentActiveTab = 'home';
        } else {
            currentActiveTab = null;
        }
    }

    $('#main-nav ul li a').click(function (event) {
        event.preventDefault();
        const tabId = $(this).data('tab');

        if (tabId === 'home') {
            showContentArea('home-page');
        } else {
            showContentArea(`${tabId}-content`);
            loadTabData(tabId);
        }
    });

    $('.grid-item').click(function () {
        const tabId = $(this).data('tab-link');
        if (tabId) {
            showContentArea(`${tabId}-content`);
            loadTabData(tabId);
        }
    });

    $(document).on('click', '.edit-btn', function () {
        if ($('#auth-status #logout-btn').length === 0) {
            showToast("You must be logged in to edit timings.", 'warning');
            return;
        }

        const rowIndex = $(this).data('index');
        const tabId = $(this).data('tab');

        if (!tabData[tabId] || !tabData[tabId][rowIndex]) {
            showToast("Error: Data for editing not found.", 'error');
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
            setTimeout(() => {
                $('#edit-time-hour').val(displayHour);
                $('#edit-time-minute').val(String(minute).padStart(2, '0'));
                $('#edit-time-ampm').val(ampm);
            }, 0);

        } else {
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
    });

    $('.close-button').click(function () {
        $('#edit-modal').removeClass('show'); // Remove 'show' class to hide modal
    });

    $(window).click(function (event) {
        if ($(event.target).is('#edit-modal')) {
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

    $('#save-edit-btn').click(function () {
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
            return;
        }

        if (newMapUrl !== '' && !isValidUrl(newMapUrl)) {
            showToast('Please enter a valid URL for the Map URL, or leave it empty.', 'error');
            return;
        }

        if (tabData[tabId] && tabData[tabId][rowIndex]) {
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
                    displayTable(tabId, tabData[tabId]);
                    $('#edit-modal').removeClass('show'); // Remove 'show' class to hide modal
                    showToast('Timings saved successfully on the server!', 'success');
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 401 || jqXHR.status === 403) {
                        showToast('You are not authorized to save data. Please log in.', 'error');
                    } else {
                        showToast('Failed to save data to server. Please check console for details.', 'error');
                    }
                }
            });

        } else {
            showToast('Error: Could not find data to update in memory.', 'error');
        }
    });

    $(document).on('click', '.view-location-btn', function () {
        const mapUrl = $(this).data('map-url');
        if (mapUrl && mapUrl !== '#') {
            window.open(mapUrl, '_blank');
        } else {
            showToast('No valid map URL available for this location.', 'info');
        }
    });

    function populateTimeDropdowns() {
        const hourSelect = $('#edit-time-hour');
        const minuteSelect = $('#edit-time-minute');
        const ampmSelect = $('#edit-time-ampm');

        hourSelect.empty();
        minuteSelect.empty();
        ampmSelect.empty();

        hourSelect.append($('<option>', { value: '', text: 'Hour', disabled: true }));
        minuteSelect.append($('<option>', { value: '', text: 'Min', disabled: true }));
        ampmSelect.append($('<option>', { value: '', text: 'AM/PM', disabled: true }));

        for (let i = 1; i <= 12; i++) {
            hourSelect.append($('<option>', {
                value: String(i).padStart(2, '0'),
                text: String(i).padStart(2, '0')
            }));
        }

        for (let i = 0; i <= 59; i++) {
            minuteSelect.append($('<option>', {
                value: String(i).padStart(2, '0'),
                text: String(i).padStart(2, '0')
            }));
        }

        ampmSelect.append($('<option>', { value: 'AM', text: 'AM' }));
        ampmSelect.append($('<option>', { value: 'PM', text: 'PM' }));
    }

    populateTimeDropdowns();

    if ($('#content').length > 0) {
        $('.content-section').hide();

        const isAuthenticated = $('#auth-status #logout-btn').length > 0;

        if (isAuthenticated) {
            showContentArea('home-page');
            $('#main-nav').show();
            $('nav#main-nav ul li a[data-tab="home"]').addClass('active');
        } else {
            showContentArea('home-page');
            $('#main-nav').show();
            $('nav#main-nav ul li a[data-tab="home"]').addClass('active');
        }
    } else if ($('#login-page').length > 0) {
        $('#main-nav').hide();
        $('#auth-status').hide();
    }
});
