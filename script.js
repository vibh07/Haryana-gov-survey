document.addEventListener('DOMContentLoaded', () => {
    // #############################################################################
    // #  PASTE YOUR WEB APP URL IN THE LINE BELOW                                  #
    // #############################################################################
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyl3rAB0Vk2ccJgL85FdABL9b64a4_KG8DWmSjG5tmP7rLfCMD-u01Q3VpdrlSzpLVLBw/exec';
    
    // --- Element References ---
    const form = document.getElementById('survey-form');
    const dobInput = document.getElementById('dob');
    const ageInput = document.getElementById('age');
    const formStatus = document.getElementById('form-status');
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const tableBody = document.getElementById('table-body');
    const filterInputs = document.querySelectorAll('.filters input');
    const downloadExcelBtn = document.getElementById('download-excel');
    const downloadPdfBtn = document.getElementById('download-pdf');

    let allData = [];

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

    // --- Accurate Age Calculation Function ---
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
        const saveButton = document.getElementById('save-button');
        saveButton.disabled = true;
        formStatus.textContent = 'Saving... Please wait.';

        const originalFormData = new FormData(form);
        const processedFormData = new FormData();

        for (let [key, value] of originalFormData.entries()) {
            if (typeof value === 'string' && value.trim() === '') {
                processedFormData.append(key, 'Not Filled');
            } else {
                processedFormData.append(key, value);
            }
        }

        fetch(scriptURL, { method: 'POST', body: processedFormData })
            .then(response => response.json())
            .then(data => {
                if(data.result === 'success'){
                    alert('Data saved successfully!');
                    clearForm();
                    if (document.getElementById('details-tab').classList.contains('active')) {
                        fetchAndDisplayData(); 
                    }
                } else {
                    alert('An error occurred: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error!', error.message);
                alert('An error occurred while saving. Check the browser console (F12) for details.');
            })
            .finally(() => {
                saveButton.disabled = false;
                formStatus.textContent = '';
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

    // --- Data Fetching and Displaying ---
    function fetchAndDisplayData() {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Loading data...</td></tr>';
        fetch(scriptURL)
            .then(response => response.json())
            .then(data => {
                allData = data.sort((a, b) => (b.SNo || 0) - (a.SNo || 0));
                renderTable(allData);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Failed to load data.</td></tr>';
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
                <td>${row.SNo || ''}</td>
                <td>${row.GaliNo || ''}</td>
                <td>${row.HouseNo || ''}</td>
                <td>${row.Name || ''}</td>
                <td>${row.Relation || ''}</td>
                <td>${dob !== 'Invalid Date' ? dob : (row.DOB || '')}</td>
                <td>${row.Age || ''}</td>
                <td>${row.AadharNo || ''}</td>
                <td>${row.PhoneNo || ''}</td>
                <td>${row.Married || ''}</td>
            `;
            tableBody.appendChild(tr);
        });
    }
    
    // --- Filtering Logic ---
    function getFilteredData() {
        const filters = {
            name: document.getElementById('filter-name').value.toLowerCase(),
            age: document.getElementById('filter-age').value,
            house: document.getElementById('filter-house').value.toLowerCase(),
            year: document.getElementById('filter-year').value
        };
        if (allData.length === 0) return [];
        return allData.filter(row => {
            const dobYear = row.DOB ? new Date(row.DOB).getFullYear().toString() : '';
            return ((row.Name || '').toLowerCase().includes(filters.name) && 
                    (row.Age || '').toString().includes(filters.age) && 
                    (row.HouseNo || '').toLowerCase().includes(filters.house) && 
                    (!filters.year || dobYear === filters.year));
        });
    }

    filterInputs.forEach(input => {
        input.addEventListener('keyup', () => {
            renderTable(getFilteredData());
        });
    });

    // --- Exporting Logic ---
    downloadExcelBtn.addEventListener('click', () => {
        const dataToExport = getFilteredData();
        if (dataToExport.length === 0) { alert("No data to export!"); return; }
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "SurveyData");
        XLSX.writeFile(workbook, "SurveyData.xlsx");
    });

    // #############################################################################
    // #  (UPDATED) PDF DOWNLOAD FUNCTION                                          #
    // #############################################################################
    downloadPdfBtn.addEventListener('click', () => {
        const dataToExport = getFilteredData();
        if (dataToExport.length === 0) {
            alert("No data to export!");
            return;
        }

        const { jsPDF } = window.jspdf;
        // CHANGED: Orientation is now 'l' for landscape
        const doc = new jsPDF('l', 'mm', 'a4'); 
        
        // Define the headers for the PDF table
        const headers = [
            'SNo', 'GaliNo', 'HouseNo', 'Name', 'Relation', 'DOB', 'Age', 'Education', 'Caste', 
            'AadharNo', 'PhoneNo', 'RationCard', 'Married', 'FamilyPlanning', 'Occupation', 
            'Disabled', 'Nasha', 'Mediclaim', 'Diseases', 'Owner'
        ];

        // Prepare the rows of data for the PDF table
        const tableRows = dataToExport.map(row => headers.map(header => {
            if (header === 'DOB' && row[header]) {
                // Format the date nicely
                return new Date(row[header]).toLocaleDateString('en-GB');
            }
            // Return the data for each header, or an empty string if it doesn't exist
            return row[header] !== undefined ? row[header] : '';
        }));
        
        // --- Generate Timestamp for Sheet No ---
        const now = new Date();
        const pad = (num) => (num < 10 ? '0' + num : num);
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

        // Add title and the new timestamp
        doc.text("Government Survey Data Report", 14, 15);
        doc.text(`Generated on: ${timestamp}`, 14, 22);

        // Use autoTable to create the PDF with better styling
        doc.autoTable({
            head: [headers],
            body: tableRows,
            startY: 30, // Start the table below the title
            theme: 'grid', // 'striped' or 'grid'
            headStyles: { fillColor: [0, 86, 179] }, // Header color
            // CHANGED: Smaller font and padding to fit more data
            styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' }, 
            // Let the library decide column widths automatically in landscape
        });

        doc.save(`GovSurveyData_${timestamp}.pdf`);
    });
});