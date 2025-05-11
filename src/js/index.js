const NBU_API_BASE_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange';
let currencyRates = [];

function generateDateArray(days) {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= days; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);
        const year = pastDate.getFullYear();
        const month = String(pastDate.getMonth() + 1).padStart(2, '0');
        const day = String(pastDate.getDate()).padStart(2, '0');
        dates.push(`${year}${month}${day}`);
    }
    return dates;
}

function generateDateArrayRange(startDateStr, endDateStr) {
    const dates = [];
    const historyErrorElement = document.getElementById('history-error');
    historyErrorElement.textContent = '';

    let currentDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) {
        historyErrorElement.textContent = 'Невірний формат дати. Оберіть дати з календаря.';
        return [];
    }
    if (currentDate > endDate) {
        historyErrorElement.textContent = 'Дата початку не може бути пізнішою за дату завершення.';
        return [];
    }

    const MAX_DAYS_RANGE = 90;
    let dayCount = 0;

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}${month}${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
        if (dayCount > MAX_DAYS_RANGE) {
            historyErrorElement.textContent = `Діапазон занадто великий. Максимум ${MAX_DAYS_RANGE} днів.`;
            return [];
        }
    }
    return dates;
}

async function fetchRates(valcode, date) {
    const url = `${NBU_API_BASE_URL}?valcode=${valcode}&date=${date}&json`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`NBU API non-OK response for ${valcode} on ${date}: ${response.status}`);
            return { error: true, date: date, message: `API error status ${response.status}` };
        }
        const data = await response.json();
        if (data.length > 0) {
            return data[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Failed to fetch rate for ${valcode} on ${date}:`, error);
        return { error: true, date: date, message: error.message };
    }
}

function renderCurrencyHistory(historyData) {
    const historyListElement = document.getElementById('currency-history-list');
    historyListElement.innerHTML = '';

    if (!historyData || historyData.length === 0) {
        historyListElement.innerHTML = '<li>Для обраного періоду та валюти немає даних про курс.</li>';
        return;
    }

    historyData.forEach(record => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span class="history-date">${record.exchangedate}</span>
            <span class="history-rate">${typeof record.rate === 'number' ? record.rate.toFixed(4) : 'N/A'} ₴</span>
        `;
        historyListElement.appendChild(listItem);
    });
}

async function loadCurrencyHistory(currencyCode, datesArray) {
    const historyListElement = document.getElementById('currency-history-list');
    const loadingHistoryElement = document.querySelector('.loading-history');
    const historyErrorElement = document.getElementById('history-error');
    const selectedHistoryCurrencySpan = document.getElementById('selected-history-currency');

    if (typeof currencyCode !== 'string' || !currencyCode.trim()) {
        selectedHistoryCurrencySpan.textContent = 'Валюту не обрано';
        historyErrorElement.textContent = 'Невірний код валюти для завантаження історії.';
        historyListElement.innerHTML = '<li>Оберіть валюту зі списку зліва.</li>';
        loadingHistoryElement.style.display = 'none';
        return;
    }

    const currencyInfo = currencyRates.find(c => c.cc === currencyCode);
    if (currencyInfo) {
        selectedHistoryCurrencySpan.textContent = `${currencyInfo.cc} - ${currencyInfo.txt}`;
    } else {
        selectedHistoryCurrencySpan.textContent = currencyCode;
    }

    historyListElement.innerHTML = '';
    if(datesArray && datesArray.length > 0) historyErrorElement.textContent = '';
    loadingHistoryElement.style.display = 'block';

    try {
        if (!datesArray || datesArray.length === 0) {
            if(!historyErrorElement.textContent) {
                historyErrorElement.textContent = 'Не вказано дат для завантаження історії.';
            }
            renderCurrencyHistory([]);
            return;
        }

        const ratePromises = datesArray.map(date => fetchRates(currencyCode, date));
        const results = await Promise.all(ratePromises);

        const validRates = results.filter(r => r && !r.error && typeof r.rate === 'number');
        const fetchErrors = results.filter(r => r && r.error);

        if (fetchErrors.length > 0) {
            console.warn(`Errors encountered for ${currencyCode} history:`, fetchErrors);
            let currentError = historyErrorElement.textContent;
            historyErrorElement.textContent = (currentError ? currentError + " " : "") + `Не вдалося завантажити дані для ${fetchErrors.length} дат.`;
        }

        console.log(`Workspaceed and sorted currency history for ${currencyCode}:`, validRates);

        if (validRates.length > 0) {
            validRates.sort((a, b) => {
                const dateA = new Date(a.exchangedate.split('.').reverse().join('-'));
                const dateB = new Date(b.exchangedate.split('.').reverse().join('-'));
                return dateB - dateA;
            });
        }

        renderCurrencyHistory(validRates);
        if (validRates.length === 0 && fetchErrors.length === 0 && datesArray.length > 0) {
            historyListElement.innerHTML = '<li>Для обраного періоду та валюти немає даних про курс (можливо, вихідні або святкові дні).</li>';
        }

    } catch (error) {
        console.error(`Error in loadCurrencyHistory for ${currencyCode}:`, error);
        historyErrorElement.textContent = 'Загальна помилка завантаження історії курсів.';
        renderCurrencyHistory([]);
    } finally {
        loadingHistoryElement.style.display = 'none';
    }
}

function renderCurrencyList(data) {
    const currencyListElement = document.getElementById('currency-list');
    currencyListElement.innerHTML = '';
    data.sort((a, b) => a.cc.localeCompare(b.cc));

    data.forEach((currency, index) => {
        setTimeout(() => {
            const listItem = document.createElement('li');
            listItem.className = 'currency-item';
            listItem.style.opacity = '0';
            listItem.style.transform = 'translateX(-20px)';
            listItem.setAttribute('data-cc', currency.cc);

            listItem.innerHTML = `
                <div class="currency-info">
                    <span class="currency-code">${currency.cc}</span>
                    <span class="currency-name">${currency.txt}</span>
                </div>
                <span class="currency-rate">${currency.rate.toFixed(2)} ₴</span>
            `;

            listItem.addEventListener('click', () => {
                const defaultDates = generateDateArray(7);
                loadCurrencyHistory(currency.cc, defaultDates);
                document.getElementById('start-date').value = '';
                document.getElementById('end-date').value = '';
            });

            currencyListElement.appendChild(listItem);
            setTimeout(() => {
                listItem.style.opacity = '1';
                listItem.style.transform = 'translateX(0)';
            }, 50);
        }, index * 50);
    });
}

function fillDataLists(data) {
    const currencySelectElement = document.getElementById('currency-select');
    const currencyOutputSelectElement = document.getElementById('currency-output-select');
    currencySelectElement.innerHTML = '';
    currencyOutputSelectElement.innerHTML = '';

    data.forEach(currency => {
        const option1 = document.createElement('option');
        option1.value = `${currency.cc} - ${currency.txt}`;
        option1.setAttribute('data-rate', currency.rate);
        option1.setAttribute('data-code', currency.cc);
        const option2 = option1.cloneNode(true);
        currencySelectElement.appendChild(option1);
        currencyOutputSelectElement.appendChild(option2);
    });
}

function getRateFromInput(inputElement, datalistId) {
    const value = inputElement.value;
    const dataList = document.getElementById(datalistId);
    for (const option of dataList.options) {
        if (option.value === value) {
            return parseFloat(option.getAttribute('data-rate'));
        }
    }
    return null;
}

function animateArrow(arrowId) {
    const arrow = document.getElementById(arrowId);
    arrow.classList.remove('animate-arrow');
    void arrow.offsetWidth;
    arrow.classList.add('animate-arrow');
}

function convertToUAH() {
    const amountForeignElement = document.getElementById('amount-foreign');
    const currencyInputElement = document.getElementById('currency-input');
    const amountUahElement = document.getElementById('amount-uah');
    const errorElement = document.getElementById('foreign-error');
    errorElement.textContent = '';

    const amount = parseFloat(amountForeignElement.value);
    if (isNaN(amount) || amount < 0) {
        errorElement.textContent = 'Будь ласка, введіть коректну суму.';
        amountUahElement.value = '';
        return;
    }
    const rate = getRateFromInput(currencyInputElement, 'currency-select');
    if (!rate) {
        errorElement.textContent = 'Будь ласка, виберіть валюту зі списку.';
        amountUahElement.value = '';
        return;
    }
    animateArrow('arrow-down-1');
    setTimeout(() => {
        amountUahElement.value = (amount * rate).toFixed(2);
        amountUahElement.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
        setTimeout(() => { amountUahElement.style.backgroundColor = ''; }, 1000);
    }, 500);
}

function convertFromUAH() {
    const amountUahInputElement = document.getElementById('amount-uah-input');
    const currencyOutputElement = document.getElementById('currency-output');
    const amountForeignResultElement = document.getElementById('amount-foreign-result');
    const errorElement = document.getElementById('uah-error');
    errorElement.textContent = '';

    const amount = parseFloat(amountUahInputElement.value);
    if (isNaN(amount) || amount < 0) {
        errorElement.textContent = 'Будь ласка, введіть коректну суму.';
        amountForeignResultElement.value = '';
        return;
    }
    const rate = getRateFromInput(currencyOutputElement, 'currency-output-select');
    if (!rate) {
        errorElement.textContent = 'Будь ласка, виберіть валюту зі списку.';
        amountForeignResultElement.value = '';
        return;
    }
    animateArrow('arrow-down-2');
    setTimeout(() => {
        amountForeignResultElement.value = (amount / rate).toFixed(2);
        amountForeignResultElement.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
        setTimeout(() => { amountForeignResultElement.style.backgroundColor = ''; }, 1000);
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

    fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            currencyRates = data;
            document.querySelector('.loading').style.display = 'none';
            document.getElementById('currency-list').style.display = 'block';
            renderCurrencyList(data);
            fillDataLists(data);

            const usdData = data.find(currency => currency.cc === 'USD');
            if (usdData) {
                console.log('Курс долара США сьогодні:', usdData.rate);
                const defaultDatesForUSD = generateDateArray(7);
                loadCurrencyHistory(usdData.cc, defaultDatesForUSD);
            } else {
                document.getElementById('selected-history-currency').textContent = 'Валюту не обрано';
                document.getElementById('currency-history-list').innerHTML = '<li>Оберіть валюту зі списку зліва, щоб побачити історію.</li>';
                document.querySelector('.loading-history').style.display = 'none';
            }
        })
        .catch(err => {
            console.error('Помилка завантаження основних даних про курси валют:', err);
            document.querySelector('.loading').innerHTML = '<div class="error">Помилка завантаження даних. Спробуйте оновити сторінку.</div>';
            document.getElementById('selected-history-currency').textContent = 'Помилка';
            document.getElementById('currency-history-list').innerHTML = '<li>Не вдалося завантажити дані.</li>';
            document.querySelector('.loading-history').style.display = 'none';
        });

    document.getElementById('amount-foreign').addEventListener('input', convertToUAH);
    document.getElementById('currency-input').addEventListener('input', convertToUAH);
    document.getElementById('amount-uah-input').addEventListener('input', convertFromUAH);
    document.getElementById('currency-output').addEventListener('input', convertFromUAH);

    document.getElementById('fetch-history-range-btn').addEventListener('click', () => {
        const startDateStr = document.getElementById('start-date').value;
        const endDateStr = document.getElementById('end-date').value;
        const selectedCurrencyHeader = document.getElementById('selected-history-currency').textContent;
        const historyErrorElement = document.getElementById('history-error');
        historyErrorElement.textContent = '';

        if (!startDateStr || !endDateStr) {
            historyErrorElement.textContent = 'Будь ласка, оберіть обидві дати.';
            return;
        }
        if (!selectedCurrencyHeader || selectedCurrencyHeader === '...' || selectedCurrencyHeader === 'Валюту не обрано' || selectedCurrencyHeader === 'Помилка') {
            historyErrorElement.textContent = 'Будь ласка, спочатку оберіть валюту зі списку зліва.';
            return;
        }

        const currencyCode = selectedCurrencyHeader.split(' - ')[0];
        if (!currencyRates.some(c => c.cc === currencyCode)) {
            historyErrorElement.textContent = `Обрана валюта (${currencyCode}) недійсна або не завантажена.`;
            return;
        }

        const datesArray = generateDateArrayRange(startDateStr, endDateStr);
        if (datesArray && datesArray.length > 0) { // Ensure datesArray is not null/undefined and has elements
            loadCurrencyHistory(currencyCode, datesArray);
        } else if (!historyErrorElement.textContent) {
            historyErrorElement.textContent = 'Не вдалося сформувати діапазон дат. Перевірте введені дати.';
        }
    });
});