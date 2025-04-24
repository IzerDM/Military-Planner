        document.addEventListener('DOMContentLoaded', function() {
            const TABS = [
                { btn: 'tab-schedule', content: 'content-schedule' },
                { btn: 'tab-militaires', content: 'content-militaires' },
                { btn: 'tab-history', content: 'content-history' }
            ];
            TABS.forEach((tab, idx) => {
                document.getElementById(tab.btn).addEventListener('click', () => {
                    TABS.forEach(other => {
                        document.getElementById(other.btn).classList.remove('bg-white', 'text-blue-800');
                        document.getElementById(other.btn).classList.add('text-blue-700');
                        document.getElementById(other.content).classList.remove('active');
                    });
                    document.getElementById(tab.btn).classList.add('bg-white', 'text-blue-800');
                    document.getElementById(tab.btn).classList.remove('text-blue-700');
                    document.getElementById(tab.content).classList.add('active');
                });
            });

            let militaires = JSON.parse(localStorage.getItem('militaires')) || [];
            let scheduleHistory = JSON.parse(localStorage.getItem('scheduleHistory')) || [];
            let currentSchedule = JSON.parse(localStorage.getItem('currentSchedule')) || null;
            let editMilitaireId = null;
            let currentDateFields = 1;
            const MAX_DATE_FIELDS = 20;

            // Format a date for display
            function formatDate(date) {
                return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
            function formatSimpleDate(date) {
                return new Date(date).toLocaleDateString('fr-FR');
            }
            // Get the week start (Monday)
            function getCurrentWeekStart() {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                return new Date(now.setDate(diff));
            }
            function getNextWeekStart() {
                const current = getCurrentWeekStart();
                current.setDate(current.getDate() + 7);
                return current;
            }
            // Get an array of the 7 dates of the week
            function getWeekDates(startDate) {
                const dates = [];
                const d = new Date(startDate);
                for (let i = 0; i < 7; i++) {
                    dates.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
                return dates;
            }
            // Update the week display
            function updateCurrentWeekDisplay(startDate) {
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                document.getElementById('current-week-display').textContent = 
                    `Semaine du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`;
            }
            // Unique ID gen
            function generateId() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            }
            // --- MILITAIRES FUNCTIONS ---
            function displayMilitaires() {
                const militairesList = document.getElementById('militaires-list');
                militairesList.innerHTML = '';
                militaires.forEach(m => {
                    let statusClass = 'text-green-700';
                    if (m.status === 'Malade') statusClass = 'text-red-700';
                    else if (m.status === 'En mission') statusClass = 'text-blue-700';
                    else if (m.status === 'En vacances') statusClass = 'text-purple-700';
                    else if (m.status === 'Absent') statusClass = 'text-gray-600';
                    let dateInfo = '';
                    if (m.workDates && m.workDates.length > 0) {
                        const latestDate = new Date(Math.max(...m.workDates.map(d => new Date(d))));
                        dateInfo = `<p class="text-sm text-gray-600 mb-1">Dernière permanence: ${formatSimpleDate(latestDate)}</p>`;
                    }
                    let gradeDisplay = m.rank ? `<span class="px-2 py-1 text-xs bg-blue-100 rounded text-blue-900 ml-1">${m.rank}</span>` : '';
                    let card = document.createElement('div');
                    card.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-md';
                    card.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="text-lg font-medium">${m.name}${gradeDisplay}</h4>
                                ${dateInfo}
                                <p class="font-medium ${statusClass}">${m.status}</p>
                                <p class="text-sm text-gray-500 mt-1">Matricule: <span class="font-medium">${m.matricule || '-'}</span></p>
                                <p class="text-sm text-gray-500 mt-1">Téléphone: <span class="font-medium">${m.phone || '-'}</span></p>
                            </div>
                            <div class="flex flex-col space-y-1">
                                <button class="edit-dates-btn text-blue-700 hover:text-blue-900" data-id="${m.id}" title="Dates de permanence">
                                    <i class="fas fa-calendar-alt"></i>
                                </button>
                                <button class="edit-militaire-btn text-green-700 hover:text-green-900" data-id="${m.id}" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    militairesList.appendChild(card);
                });
                document.querySelectorAll('.edit-militaire-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        openMilitaireModal(id);
                    });
                });
                document.querySelectorAll('.edit-dates-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const id = this.getAttribute('data-id');
                        openDatesModal(id);
                    });
                });
            }
            // --- MODALS ---
            function openMilitaireModal(id) {
                editMilitaireId = id;
                const m = militaires.find(m => m.id === id);
                if (m) {
                    document.getElementById('edit-militaire-name').value = m.name || '';
                    document.getElementById('edit-militaire-rank').value = m.rank || '';
                    document.getElementById('edit-militaire-matricule').value = m.matricule || '';
                    document.getElementById('edit-militaire-phone').value = m.phone || '';
                    document.getElementById('edit-militaire-status').value = m.status || 'Disponible';
                    document.getElementById('edit-militaire-id').value = id;
                    document.getElementById('militaire-modal').classList.remove('hidden');
                }
            }
            function openDatesModal(id) {
                const m = militaires.find(m => m.id === id);
                if (!m) return;
                document.getElementById('modal-militaire-name').textContent = `Dates de permanence pour ${m.name}`;
                const container = document.getElementById('work-dates-container');
                container.innerHTML = '';
                const workDates = m.workDates || [];
                currentDateFields = Math.max(1, workDates.length);
                for (let i = 0; i < currentDateFields; i++) {
                    const dateValue = workDates[i] ? new Date(workDates[i]).toISOString().split('T')[0] : '';
                    addDateField(container, dateValue, i + 1);
                }
                document.getElementById('add-dates-modal').classList.remove('hidden');
                document.getElementById('save-dates').setAttribute('data-id', m.id);
            }
            function addDateField(container, value = '', index) {
                const group = document.createElement('div');
                group.className = 'flex items-center space-x-2';
                group.innerHTML = `
                    <span class="text-sm font-medium w-6">${index}.</span>
                    <input type="date" class="work-date-input px-3 py-2 border border-gray-300 rounded-md flex-grow" value="${value}">
                `;
                container.appendChild(group);
            }
            // --- SCHEDULE FUNCTIONS ---
            function displayCurrentSchedule() {
                if (!currentSchedule) return;
                const tbody = document.getElementById('schedule-body');
                tbody.innerHTML = '';
                updateCurrentWeekDisplay(new Date(currentSchedule.startDate));
                currentSchedule.assignments.forEach(assignment => {
                    const tr = document.createElement('tr');
                    const dateObj = new Date(assignment.date);
                    let militaire =
                        militaires.find(m => m.id === assignment.militaireId) || {};
                    let name = militaire.name || (assignment.name || '- Non assigné -');
                    tr.innerHTML = `
                        <td class="border border-gray-300 px-4 py-2">${dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })}</td>
                        <td class="border border-gray-300 px-4 py-2">${dateObj.toLocaleDateString('fr-FR')}</td>
                        <td class="border border-gray-300 px-4 py-2">${name}</td>
                        <td class="border border-gray-300 px-4 py-2">${militaire.rank || '-'}</td>
                        <td class="border border-gray-300 px-4 py-2">${militaire.matricule || '-'}</td>
                        <td class="border border-gray-300 px-4 py-2">${militaire.phone || '-'}</td>
                        <td class="border border-gray-300 px-4 py-2 signature-space print-sign-border"></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            function displayHistory() {
                const historyList = document.getElementById('history-list');
                historyList.innerHTML = '';
                if (!scheduleHistory.length) {
                    historyList.innerHTML = '<p class="text-gray-500">Aucun historique disponible.</p>';
                    return;
                }
                scheduleHistory.slice().reverse().forEach(schedule => {
                    const startDate = new Date(schedule.startDate);
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 6);
                    const div = document.createElement('div');
                    div.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';
                    div.innerHTML = `
                        <h4 class="text-lg font-medium mb-2">Semaine du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}</h4>
                        <div class="overflow-x-auto mb-1">
                            <table class="min-w-full border border-gray-300">
                                <thead>
                                    <tr class="bg-gray-100">
                                        <th class="border border-gray-300 px-3 py-1 text-sm">Jour</th>
                                        <th class="border border-gray-300 px-3 py-1 text-sm">Date</th>
                                        <th class="border border-gray-300 px-3 py-1 text-sm">Militaire</th>
                                        <th class="border border-gray-300 px-3 py-1 text-sm">Grade</th>
                                        <th class="border border-gray-300 px-3 py-1 text-sm">Matricule</th>
                                        <th class="border border-gray-300 px-3 py-1 text-sm">Téléphone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${
                                        schedule.assignments.map(a => {
                                            const dateObj = new Date(a.date);
                                            let m = militaires.find(m => m.id === a.militaireId) || {};
                                            let name = m.name || (a.name || '- Non assigné -');
                                            return `<tr>
                                                <td class="border border-gray-300 px-3 py-1 text-sm">${dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })}</td>
                                                <td class="border border-gray-300 px-3 py-1 text-sm">${dateObj.toLocaleDateString('fr-FR')}</td>
                                                <td class="border border-gray-300 px-3 py-1 text-sm">${name}</td>
                                                <td class="border border-gray-300 px-3 py-1 text-sm">${m.rank || '-'}</td>
                                                <td class="border border-gray-300 px-3 py-1 text-sm">${m.matricule || '-'}</td>
                                                <td class="border border-gray-300 px-3 py-1 text-sm">${m.phone || '-'}</td>
                                            </tr>`;
                                        }).join('')
                                    }
                                </tbody>
                            </table>
                        </div>
                    `;
                    historyList.appendChild(div);
                });
            }
            // --- SCHEDULE ALGORITHM ---
function generateSchedule(startDate) {
    const weekDates = getWeekDates(startDate);
    const available = militaires.filter(m => m.status === 'Disponible');
    if (available.length === 0) {
        alert('Aucun militaire disponible pour la planification.');
        return null;
    }

    const assignments = [];
    const MAX_DATE_FIELDS = 20;

    // Separate pools for weekdays and weekends
    const weekdays = [];
    const saturdays = [];
    const sundays = [];

    available.forEach(m => {
        if (!m.workDates) m.workDates = [];

        const lastWeekend = m.workDates
            .map(date => new Date(date))
            .filter(d => d.getDay() === 0 || d.getDay() === 6); // Sunday = 0, Saturday = 6

        const lastWeekendTime = lastWeekend.length
            ? Math.max(...lastWeekend.map(d => d.getTime()))
            : 0;

        m._lastWeekend = lastWeekendTime;

        const lastWork = m.workDates.length
            ? Math.max(...m.workDates.map(d => new Date(d).getTime()))
            : 0;

        m._lastWork = lastWork;

        weekdays.push(m);
        saturdays.push(m);
        sundays.push(m);
    });

    // Sort pools
    weekdays.sort((a, b) => a._lastWork - b._lastWork);
    saturdays.sort((a, b) => a._lastWeekend - b._lastWeekend);
    sundays.sort((a, b) => a._lastWeekend - b._lastWeekend);

    weekDates.forEach(dateObj => {
        const day = dateObj.getDay();
        let militaire;

        if (day === 0) {
            // Sunday
            militaire = sundays.shift();
        } else if (day === 6) {
            // Saturday
            militaire = saturdays.shift();
        } else {
            // Weekday
            militaire = weekdays.shift();
        }

        assignments.push({
            date: dateObj.toISOString(),
            militaireId: militaire.id,
            name: militaire.name
        });

        militaire.workDates.push(dateObj.toISOString());
        if (militaire.workDates.length > MAX_DATE_FIELDS) {
            militaire.workDates.sort((a, b) => new Date(b) - new Date(a));
            militaire.workDates = militaire.workDates.slice(0, MAX_DATE_FIELDS);
        }

        // Reinsert the militaire back into the appropriate pool
        if (day === 0) sundays.push(militaire);
        else if (day === 6) saturdays.push(militaire);
        else weekdays.push(militaire);
    });

    localStorage.setItem('militaires', JSON.stringify(militaires));
    return {
        id: generateId(),
        startDate: startDate.toISOString(),
        assignments: assignments
    };
}
            // --- EVENTS ---
            document.getElementById('add-militaire').addEventListener('click', function() {
                const name = document.getElementById('militaire-name').value.trim();
                const rank = document.getElementById('militaire-rank').value;
                const matricule = document.getElementById('militaire-matricule').value.trim();
                const phone = document.getElementById('militaire-phone').value.trim();
                const status = document.getElementById('militaire-status').value;
                if (!name) {
                    alert('Entrer le nom complet du militaire SVP.');
                    return;
                }
                let m = {
                    id: generateId(),
                    name,
                    rank,
                    matricule,
                    phone,
                    status,
                    workDates: []
                };
                militaires.push(m);
                localStorage.setItem('militaires', JSON.stringify(militaires));
                document.getElementById('militaire-name').value = '';
                document.getElementById('militaire-rank').value = '';
                document.getElementById('militaire-matricule').value = '';
                document.getElementById('militaire-phone').value = '';
                document.getElementById('militaire-status').value = 'Disponible';
                displayMilitaires();
            });
            document.getElementById('generate-this-week').addEventListener('click', function() {
                const startDate = getCurrentWeekStart();
                const schedule = generateSchedule(startDate);
                if (schedule) {
                    currentSchedule = schedule;
                    localStorage.setItem('currentSchedule', JSON.stringify(schedule));
                    scheduleHistory.push(schedule);
                    localStorage.setItem('scheduleHistory', JSON.stringify(scheduleHistory));
                    displayCurrentSchedule();
                    displayHistory();
                }
            });
            document.getElementById('generate-next-week').addEventListener('click', function() {
                const startDate = getNextWeekStart();
                const schedule = generateSchedule(startDate);
                if (schedule) {
                    currentSchedule = schedule;
                    localStorage.setItem('currentSchedule', JSON.stringify(schedule));
                    scheduleHistory.push(schedule);
                    localStorage.setItem('scheduleHistory', JSON.stringify(scheduleHistory));
                    displayCurrentSchedule();
                    displayHistory();
                }
            });
            document.getElementById('print-schedule').addEventListener('click', function() {
                // show signatures in print
                document.querySelectorAll('.signature-space').forEach(el => el.style.display = 'block');
                setTimeout(() => window.print(), 150);
                setTimeout(() => document.querySelectorAll('.signature-space').forEach(el => el.style.display = ''), 1000);
            });
            document.getElementById('close-militaire-modal').addEventListener('click', function() {
                document.getElementById('militaire-modal').classList.add('hidden');
            });
            document.getElementById('save-militaire').addEventListener('click', function() {
                const name = document.getElementById('edit-militaire-name').value.trim();
                const rank = document.getElementById('edit-militaire-rank').value;
                const matricule = document.getElementById('edit-militaire-matricule').value.trim();
                const phone = document.getElementById('edit-militaire-phone').value.trim();
                const status = document.getElementById('edit-militaire-status').value;
                const id = document.getElementById('edit-militaire-id').value;
                if (!name) {
                    alert('Entrer le nom complet du militaire SVP.');
                    return;
                }
                const idx = militaires.findIndex(m => m.id === id);
                if (idx !== -1) {
                    militaires[idx].name = name;
                    militaires[idx].rank = rank;
                    militaires[idx].matricule = matricule;
                    militaires[idx].phone = phone;
                    militaires[idx].status = status;
                    localStorage.setItem('militaires', JSON.stringify(militaires));
                    displayMilitaires();
                    document.getElementById('militaire-modal').classList.add('hidden');
                }
            });
            document.getElementById('delete-militaire').addEventListener('click', function() {
                const id = document.getElementById('edit-militaire-id').value;
                if (confirm('Êtes-vous sûr de vouloir supprimer ce militaire ?')) {
                    militaires = militaires.filter(m => m.id !== id);
                    localStorage.setItem('militaires', JSON.stringify(militaires));
                    displayMilitaires();
                    document.getElementById('militaire-modal').classList.add('hidden');
                }
            });
            document.getElementById('close-dates-modal').addEventListener('click', function() {
                document.getElementById('add-dates-modal').classList.add('hidden');
            });
            document.getElementById('add-date-field').addEventListener('click', function() {
                if (currentDateFields < MAX_DATE_FIELDS) {
                    currentDateFields++;
                    const container = document.getElementById('work-dates-container');
                    addDateField(container, '', currentDateFields);
                } else {
                    alert(`Vous ne pouvez pas ajouter plus de ${MAX_DATE_FIELDS} dates.`);
                }
            });
            document.getElementById('remove-date-field').addEventListener('click', function() {
                if (currentDateFields > 1) {
                    const container = document.getElementById('work-dates-container');
                    container.removeChild(container.lastChild);
                    currentDateFields--;
                }
            });
            document.getElementById('save-dates').addEventListener('click', function() {
                const militaireId = this.getAttribute('data-id');
                const dateInputs = document.querySelectorAll('.work-date-input');
                const dates = [];
                dateInputs.forEach(input => {
                    if (input.value) {
                        dates.push(new Date(input.value).toISOString());
                    }
                });
                dates.sort((a, b) => new Date(b) - new Date(a));
                const idx = militaires.findIndex(m => m.id === militaireId);
                if (idx !== -1) {
                    militaires[idx].workDates = dates;
                    localStorage.setItem('militaires', JSON.stringify(militaires));
                    displayMilitaires();
                    document.getElementById('add-dates-modal').classList.add('hidden');
                }
            });

            // INIT DISPLAYS
            displayMilitaires();
            displayCurrentSchedule();
            displayHistory();
        });
