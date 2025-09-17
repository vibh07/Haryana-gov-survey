document.addEventListener('DOMContentLoaded', () => {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyl3rAB0Vk2ccJgL85FdABL9b64a4_KG8DWmSjG5tmP7rLfCMD-u01Q3VpdrlSzpLVLBw/exec';
    
    // --- Element References ---
    const form = document.getElementById('survey-form');
    const dobInput = document.getElementById('dob');
    const ageInput = document.getElementById('age');
    const notification = document.getElementById('notification');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const tableBody = document.getElementById('table-body');
    const filterInputs = document.querySelectorAll('.filters input');
    const downloadExcelBtn = document.getElementById('download-excel');
    const downloadPdfBtn = document.getElementById('download-pdf');

    let allData = [];
    let notificationTimeout;

    // --- Notification System ---
    function showNotification(message, type) {
        if (notificationTimeout) clearTimeout(notificationTimeout);
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // --- Tab Switching Logic ---
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'details-tab') {
                fetchAndDisplayData();
            }
        });
    });

    // --- Accurate Age Calculation ---
    function calculateAccurateAge(dobString) {
        if (!dobString) return '';
        const birthDate = new Date(dobString);
        if (isNaN(birthDate.getTime())) return '';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const birthMonth = birthDate.getMonth();
        const todayMonth = today.getMonth();
        const birthDay = birthDate.getDate();
        const todayDay = today.getDate();
        if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
            age--;
        }
        return age >= 0 ? age : '';
    }

    dobInput.addEventListener('change', () => {
        ageInput.value = calculateAccurateAge(dobInput.value);
    });

    // --- Form Submission Logic ---
    form.addEventListener('submit', e => {
        e.preventDefault();
        const processedFormData = new FormData(form);
        const originalFormData = new FormData(form);
        for (let [key, value] of originalFormData.entries()) {
            processedFormData.append(key, typeof value === 'string' && value.trim() === '' ? 'Not Filled' : value);
        }
        clearForm();
        showNotification('Submitting entry...', 'info');
        fetch(scriptURL, { method: 'POST', body: processedFormData })
            .then(response => response.json())
            .then(data => {
                if(data.result === 'success'){
                    showNotification('Last entry saved successfully!', 'success');
                    allData = []; // Clear cache to force refresh on next Details tab click
                } else {
                    showNotification('Error: Last entry failed to save.', 'error');
                }
            })
            .catch(error => {
                console.error('Save Error!', error.message);
                showNotification('Network Error: Check your connection.', 'error');
            });
    });

    function clearForm() {
        const formElements = form.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            if (element.id !== 'gali-no' && element.id !== 'house-no') {
                element.value = '';
                if (element.tagName === 'SELECT') {
                    element.value = 'Not Filled';
                }
            }
        });
        document.getElementById('name').focus();
    }

    // --- Robust Data Fetching ---
    function fetchAndDisplayData() {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Loading data...</td></tr>';
        fetch(scriptURL)
            .then(response => {
                if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data)) throw new Error("Invalid data format received.");
                allData = data.sort((a, b) => (b.SNo || 0) - (a.SNo || 0));
                renderTable(allData);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                allData = [];
                renderTable([]);
                showNotification(`Failed to load data: ${error.message}`, 'error');
            });
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No data found.</td></tr>';
            return;
        }
        data.forEach((row) => {
            const tr = document.createElement('tr');
            const dob = row.DOB ? new Date(row.DOB).toLocaleDateString('en-GB') : 'N/A';
            tr.innerHTML = `
                <td>${row.SNo || ''}</td><td>${row.GaliNo || ''}</td><td>${row.HouseNo || ''}</td>
                <td>${row.Name || ''}</td><td>${row.Relation || ''}</td><td>${dob !== 'Invalid Date' ? dob : (row.DOB || '')}</td>
                <td>${row.Age || ''}</td><td>${row.AadharNo || ''}</td><td>${row.PhoneNo || ''}</td><td>${row.Married || ''}</td>
            `;
            tableBody.appendChild(tr);
        });
    }
    
    // #############################################################################
    // #  (FIXED) FILTERING LOGIC                                                  #
    // #############################################################################
    function applyFilters() {
        const filters = {
            name: document.getElementById('filter-name').value.toLowerCase(),
            age: document.getElementById('filter-age').value,
            house: document.getElementById('filter-house').value.toLowerCase(),
            year: document.getElementById('filter-year').value
        };

        if (!allData || allData.length === 0) {
            renderTable([]);
            return []; // Return empty array if no data
        }

        const filteredData = allData.filter(row => {
            const dobYear = row.DOB ? new Date(row.DOB).getFullYear().toString() : '';
            
            // CONVERTED TO STRING: This now safely handles both numbers and text
            const nameMatch = String(row.Name || '').toLowerCase().includes(filters.name);
            const ageMatch = String(row.Age || '').includes(filters.age);
            const houseMatch = String(row.HouseNo || '').toLowerCase().includes(filters.house);
            const yearMatch = !filters.year || dobYear === filters.year;

            return nameMatch && ageMatch && houseMatch && yearMatch;
        });
        
        renderTable(filteredData);
        return filteredData; // Return the filtered data for download functions
    }

    filterInputs.forEach(input => {
        input.addEventListener('keyup', applyFilters);
    });

    // --- (FIXED) Exporting Logic with UI Feedback ---
    downloadExcelBtn.addEventListener('click', () => {
        const originalText = downloadExcelBtn.textContent;
        downloadExcelBtn.disabled = true;
        downloadExcelBtn.textContent = 'Generating...';

        try {
            const dataToExport = applyFilters();
            if (!dataToExport || dataToExport.length === 0) {
                showNotification("No data to export!", "error");
                return;
            }
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyData");
            XLSX.writeFile(workbook, "SurveyData.xlsx");
        } catch (error) {
            console.error("Excel Export Error:", error);
            showNotification("Failed to generate Excel file.", "error");
        } finally {
            downloadExcelBtn.disabled = false;
            downloadExcelBtn.textContent = originalText;
        }
    });

    downloadPdfBtn.addEventListener('click', () => {
        const originalText = downloadPdfBtn.textContent;
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.textContent = 'Generating...';
        
        try {
            const dataToExport = applyFilters();
            if (!dataToExport || dataToExport.length === 0) {
                showNotification("No data to export!", "error");
                return;
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4'); 
            const headers = ['SNo', 'GaliNo', 'HouseNo', 'Name', 'Relation', 'DOB', 'Age', 'Education', 'Caste', 'AadharNo', 'PhoneNo', 'RationCard', 'Married', 'FamilyPlanning', 'Occupation', 'Disabled', 'Nasha', 'Mediclaim', 'Diseases', 'Owner'];
            const tableRows = dataToExport.map(row => headers.map(header => {
                if (header === 'DOB' && row[header]) return new Date(row[header]).toLocaleDateString('en-GB');
                return row[header] !== undefined ? row[header] : '';
            }));
            const now = new Date();
            const pad = (num) => (num < 10 ? '0' + num : num);
            const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            doc.setFontSize(18);
            doc.text("Government Survey Data Report", 14, 15);
            doc.setFontSize(11);
            doc.text(`Generated on: ${timestamp}`, 14, 22);
            doc.autoTable({ head: [headers], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [0, 86, 179] }, styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' } });
            doc.save(`GovSurveyData_${timestamp}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            showNotification("Failed to generate PDF file.", "error");
        } finally {
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.textContent = originalText;
        }
    });
});
