// --- НАВИГАЦИЯ ПО ВКЛАДКАМ ---
function showTab(tabId, btnElement) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Показываем нужную вкладку
    document.getElementById(tabId).classList.add('active');
    
    // Подсвечиваем нужную кнопку
    if(btnElement) {
        btnElement.classList.add('active');
    }
}

// --- ОЧИСТКА ПОЛЕЙ ---
function clearData() {
    const inputs = document.querySelectorAll('#alternativesTable input');
    inputs.forEach(input => {
        input.value = '';
        input.style.borderColor = '#cbd5e1';
    });
}

// --- ПРОВЕРКА ВВЕДЕННЫХ ДАННЫХ ---
function validateInputs() {
    const inputs = document.querySelectorAll('#alternativesTable input');
    let isValid = true;
    inputs.forEach(input => {
        const val = Number(input.value);
        if (input.value === '' || val < 1 || val > 3) {
            isValid = false;
            input.style.borderColor = 'red'; // Подсвечиваем ошибку красным
        } else {
            input.style.borderColor = '#cbd5e1'; // Сбрасываем цвет
        }
    });

    if (!isValid) {
        alert("Ошибка! Заполните все поля в таблице 'Исходные данные'. Значения должны быть целыми числами от 1 до 3.");
    }
    return isValid;
}

// Переменная для хранения графика
let myChart = null;

// --- МАТЕМАТИКА МАИ ---
function getGeometricMean(arr) {
    let product = 1;
    for (let i = 0; i < arr.length; i++) product *= arr[i];
    return Math.pow(product, 1 / arr.length);
}

function normalize(arr) {
    let sum = arr.reduce((a, b) => a + b, 0);
    return arr.map(val => val / sum);
}

function calculateAll() {
    // ПРОВЕРКА: Если поля пустые — стоп!
    if (!validateInputs()) return;

    // 1. Сбор данных из таблицы
    const altScores = {
        "РЦ": [Number(document.getElementById('rc_x').value), Number(document.getElementById('rc_p').value), Number(document.getElementById('rc_k').value), Number(document.getElementById('rc_s').value)],
        "ЭССО": [Number(document.getElementById('esso_x').value), Number(document.getElementById('esso_p').value), Number(document.getElementById('esso_k').value), Number(document.getElementById('esso_s').value)],
        "Балиса": [Number(document.getElementById('balisa_x').value), Number(document.getElementById('balisa_p').value), Number(document.getElementById('balisa_k').value), Number(document.getElementById('balisa_s').value)],
        "ВОД": [Number(document.getElementById('vod_x').value), Number(document.getElementById('vod_p').value), Number(document.getElementById('vod_k').value), Number(document.getElementById('vod_s').value)],
        "ИПД": [Number(document.getElementById('ipd_x').value), Number(document.getElementById('ipd_p').value), Number(document.getElementById('ipd_k').value), Number(document.getElementById('ipd_s').value)],
        "ПАВ": [Number(document.getElementById('pav_x').value), Number(document.getElementById('pav_p').value), Number(document.getElementById('pav_k').value), Number(document.getElementById('pav_s').value)]
    };
    const altNames = Object.keys(altScores);

    // 2. Матрица критериев
    const xp = Number(document.getElementById('comp_xp').value);
    const xk = Number(document.getElementById('comp_xk').value);
    const xs = Number(document.getElementById('comp_xs').value);
    const pk = Number(document.getElementById('comp_pk').value);
    const ps = Number(document.getElementById('comp_ps').value);
    const ks = Number(document.getElementById('comp_ks').value);

    const matrixCriteria = [
        [1, xp, xk, xs],
        [1/xp, 1, pk, ps],
        [1/xk, 1/pk, 1, ks],
        [1/xs, 1/ps, 1/ks, 1]
    ];

    // 3. Веса критериев
    const critGeoMeans = matrixCriteria.map(row => getGeometricMean(row));
    const critWeights = normalize(critGeoMeans);

    // 4. Проверка согласованности (ОС)
    let lambdaMax = 0;
    for (let i = 0; i < 4; i++) {
        let Aw = 0;
        for (let j = 0; j < 4; j++) Aw += matrixCriteria[i][j] * critWeights[j];
        lambdaMax += Aw / critWeights[i];
    }
    lambdaMax /= 4;
    const IS = (lambdaMax - 4) / 3;
    const OS = IS / 0.9;

    // 5. Локальные приоритеты альтернатив
    const localPriorities = Array(6).fill().map(() => []);
    for (let c = 0; c < 4; c++) {
        const matrixAlt = [];
        for (let i = 0; i < 6; i++) {
            const row = [];
            for (let j = 0; j < 6; j++) {
                const diff = altScores[altNames[i]][c] - altScores[altNames[j]][c];
                let val = 1;
                if (diff === 1) val = 3; else if (diff === 2) val = 5;
                else if (diff === -1) val = 1/3; else if (diff === -2) val = 1/5;
                row.push(val);
            }
            matrixAlt.push(row);
        }
        const geoMeansAlt = matrixAlt.map(row => getGeometricMean(row));
        const normalizedAlt = normalize(geoMeansAlt);
        for (let i = 0; i < 6; i++) localPriorities[i].push(normalizedAlt[i]);
    }

    // 6. Глобальные приоритеты
    const globalPriorities = [];
    for (let i = 0; i < 6; i++) {
        let gi = 0;
        for (let j = 0; j < 4; j++) gi += localPriorities[i][j] * critWeights[j];
        globalPriorities.push(gi);
    }

    // 7. Вывод результатов
    displayResults(globalPriorities, altNames, OS);
    
    // Автоматически перекидываем на вкладку результатов
    showTab('tab-results', document.querySelectorAll('.nav-btn')[3]);
}

function displayResults(globalPriorities, altNames, OS) {
    // Вывод проверки ОС
    const osDiv = document.getElementById('osCheck');
    if (OS > 0.1) {
        osDiv.className = 'os-box os-bad';
        osDiv.innerText = `ВНИМАНИЕ: ОС = ${OS.toFixed(3)} > 0.1. Матрица несогласована! Измените оценки критериев.`;
    } else {
        osDiv.className = 'os-box os-good';
        osDiv.innerText = `ОС = ${OS.toFixed(3)} < 0.1. Согласованность приемлема.`;
    }

    // Сортировка результатов
    let ranking = [];
    for (let i = 0; i < 6; i++) ranking.push({ name: altNames[i], score: globalPriorities[i] });
    ranking.sort((a, b) => b.score - a.score);

    // Вывод списка
    const list = document.getElementById('globalPrioritiesList');
    list.innerHTML = '';
    ranking.forEach(item => {
        list.innerHTML += `<li><span>${item.name}</span> <strong>${item.score.toFixed(3)}</strong></li>`;
    });
    document.getElementById('winnerText').innerText = `Оптимальный вариант: ${ranking[0].name}`;

    // Отрисовка графика Chart.js
    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    // Уничтожаем старый график, если он был
    if (myChart != null) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranking.map(item => item.name),
            datasets: [{
                label: 'Глобальный приоритет',
                data: ranking.map(item => item.score),
                backgroundColor: ranking.map((_, i) => i === 0 ? '#2563eb' : '#94a3b8'), // Победитель синий, остальные серые
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 0.5 } },
            plugins: { legend: { display: false } }
        }
    });
}