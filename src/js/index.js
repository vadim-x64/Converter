let currencyRates = [];

document.getElementById('current-date').textContent = new Date().toLocaleDateString('uk-UA');

fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json')
    .then(response => response.json())
    .then(data => {
        currencyRates = data;

        document.querySelector('.loading').style.display = 'none';
        document.getElementById('currency-list').style.display = 'block';

        renderCurrencyList(data);
        fillDataLists(data);

        const usdRate = data.find(currency => currency.cc === 'USD');
        console.log('Курс долара США:', usdRate.rate);
    })
    .catch(err => {
        console.error('Помилка завантаження даних:', err);
        document.querySelector('.loading').innerHTML =
            '<div class="error">Помилка завантаження даних. Спробуйте оновити сторінку.</div>';
    });

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

            listItem.innerHTML = `
                    <div class="currency-info">
                        <span class="currency-code">${currency.cc}</span>
                        <span class="currency-name">${currency.txt}</span>
                    </div>
                    <span class="currency-rate">${currency.rate.toFixed(2)} ₴</span>
                `;

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

        const option2 = document.createElement('option');
        option2.value = `${currency.cc} - ${currency.txt}`;
        option2.setAttribute('data-rate', currency.rate);
        option2.setAttribute('data-code', currency.cc);

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
        errorElement.textContent = 'Будь ласка, введіть коректну суму';
        amountUahElement.value = '';
        return;
    }

    const rate = getRateFromInput(currencyInputElement, 'currency-select');

    if (!rate) {
        errorElement.textContent = 'Будь ласка, виберіть валюту зі списку';
        amountUahElement.value = '';
        return;
    }

    animateArrow('arrow-down-1');

    setTimeout(() => {
        const result = amount * rate;

        amountUahElement.value = result.toFixed(2);

        amountUahElement.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
        setTimeout(() => {
            amountUahElement.style.backgroundColor = '';
        }, 1000);
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
        errorElement.textContent = 'Будь ласка, введіть коректну суму';
        amountForeignResultElement.value = '';
        return;
    }

    const rate = getRateFromInput(currencyOutputElement, 'currency-output-select');

    if (!rate) {
        errorElement.textContent = 'Будь ласка, виберіть валюту зі списку';
        amountForeignResultElement.value = '';
        return;
    }

    animateArrow('arrow-down-2');

    setTimeout(() => {
        const result = amount / rate;

        amountForeignResultElement.value = result.toFixed(2);

        amountForeignResultElement.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
        setTimeout(() => {
            amountForeignResultElement.style.backgroundColor = '';
        }, 1000);
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('amount-foreign').addEventListener('input', convertToUAH);
    document.getElementById('currency-input').addEventListener('input', convertToUAH);

    document.getElementById('amount-uah-input').addEventListener('input', convertFromUAH);
    document.getElementById('currency-output').addEventListener('input', convertFromUAH);
});