
const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const cityName = document.querySelector("#city-name");
const temperature = document.querySelector("#temperature");
const feelsLike = document.querySelector("#feels-like");
const weatherCondition = document.querySelector("#weather-condition");
const weatherIcon = document.querySelector("#weather-icon");
const humidity = document.querySelector("#humidity");
const windSpeed = document.querySelector("#wind-speed");
const sunrise = document.querySelector("#sunrise");
const sunset = document.querySelector("#sunset");
const moonPhase = document.querySelector("#moon-phase");
const moonDate = document.querySelector("#moon-date");
const moonEmoji = document.querySelector("#moon-emoji");
const errorMessage = document.querySelector("#error-message");
const weatherDisplay = document.querySelector("#weather-display");
const forecastList = document.querySelector("#forecast-list");
const recentSection = document.querySelector("#recent-section");
const recentCities = document.querySelector("#recent-cities");

const RECENT_KEY = "weatherForecastRecentCities";

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

function formatCityTime(timestamp, timezoneOffset) {
    
    const localDate = new Date((timestamp + timezoneOffset) * 1000);
    return localDate.toISOString().slice(11, 16);
}

function updateMoonPhase() {
    
    const now = new Date();
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
    const lunarMonth = 29.530588853;
    const daysSince = (now.getTime() - knownNewMoon) / 86400000;
    const age = ((daysSince % lunarMonth) + lunarMonth) % lunarMonth;
    const phase = age / lunarMonth;

    let name;
    let emoji;

    if (phase < 0.03 || phase >= 0.97) {
        name = "New Moon";
        emoji = "🌑";
    } else if (phase < 0.22) {
        name = "Waxing Crescent";
        emoji = "🌒";
    } else if (phase < 0.28) {
        name = "First Quarter";
        emoji = "🌓";
    } else if (phase < 0.47) {
        name = "Waxing Gibbous";
        emoji = "🌔";
    } else if (phase < 0.53) {
        name = "Full Moon";
        emoji = "🌕";
    } else if (phase < 0.72) {
        name = "Waning Gibbous";
        emoji = "🌖";
    } else if (phase < 0.78) {
        name = "Last Quarter";
        emoji = "🌗";
    } else {
        name = "Waning Crescent";
        emoji = "🌘";
    }

    moonPhase.textContent = name;
    moonEmoji.textContent = emoji;
    moonDate.textContent = `Approximate phase for ${now.toLocaleDateString(
        undefined,
        { day: "numeric", month: "short", year: "numeric" }
    )}`;
}

function getRecentCities() {
    try {
        const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter(city => typeof city === "string") : [];
    } catch {
        return [];
    }
}

function saveRecentCity(city) {
    const updated = [
        city,
        ...getRecentCities().filter(
            item => item.toLowerCase() !== city.toLowerCase()
        )
    ].slice(0, 5);

    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
        
    }

    renderRecentCities();
}

function renderRecentCities() {
    const cities = getRecentCities();
    recentCities.replaceChildren();
    recentSection.hidden = cities.length === 0;

    cities.forEach(city => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "recent-city";
        button.textContent = city;
        button.addEventListener("click", () => {
            cityInput.value = city;
            getWeather(city);
        });
        recentCities.appendChild(button);
    });
}

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Unable to load weather data.");
    }

    return data;
}

async function getWeather(city) {
    clearError();
    searchButton.disabled = true;
    searchButton.textContent = "Loading…";

    try {
        const data = await fetchJson(
            `/api/weather?city=${encodeURIComponent(city)}`
        );

        const timezone = data.timezone || 0;
        const condition = data.weather?.[0];

        cityName.textContent = `${data.name}${data.sys?.country ? ", " + data.sys.country : ""}`;
        temperature.textContent = `${Math.round(data.main.temp)}°C`;
        feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
        weatherCondition.textContent = condition?.description || "Conditions unavailable";
        humidity.textContent = `${data.main.humidity}%`;
        windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;

        if (condition?.icon) {
            weatherIcon.src = `https://openweathermap.org/img/wn/${condition.icon}@2x.png`;
            weatherIcon.alt = condition.description || "Weather icon";
            weatherIcon.hidden = false;
        } else {
            weatherIcon.hidden = true;
        }

        sunrise.textContent = data.sys?.sunrise
            ? formatCityTime(data.sys.sunrise, timezone)
            : "--:--";
        sunset.textContent = data.sys?.sunset
            ? formatCityTime(data.sys.sunset, timezone)
            : "--:--";

        updateMoonPhase();
        weatherDisplay.hidden = false;
        saveRecentCity(data.name);
        cityInput.value = "";

        try {
            await getForecast(city);
        } catch (error) {
            forecastList.replaceChildren();
            const message = document.createElement("p");
            message.className = "forecast-placeholder";
            message.textContent = "The five-day forecast is currently unavailable.";
            forecastList.appendChild(message);
            console.error("Forecast error:", error);
        }
    } catch (error) {
        showError(error.message || "Unable to load weather. Please try again.");
        forecastList.replaceChildren();
        const message = document.createElement("p");
        message.className = "forecast-placeholder";
        message.textContent = "Search for a valid city to load the forecast.";
        forecastList.appendChild(message);
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

async function getForecast(city) {
    const data = await fetchJson(
        `/api/forecast?city=${encodeURIComponent(city)}`
    );

    const timezone = data.city?.timezone || 0;
    const days = new Map();

    for (const item of data.list || []) {
        const localDate = new Date((item.dt + timezone) * 1000)
            .toISOString().slice(0, 10);

        if (!days.has(localDate)) {
            days.set(localDate, []);
        }

        days.get(localDate).push(item);
    }

    const today = new Date(Date.now() + timezone * 1000)
        .toISOString().slice(0, 10);

    const forecastDays = [...days.entries()]
        .filter(([date]) => date >= today)
        .slice(0, 5);

    forecastList.replaceChildren();

    if (forecastDays.length === 0) {
        throw new Error("No forecast data available.");
    }

    forecastDays.forEach(([date, entries]) => {
        
        const representative = entries.reduce((best, item) => {
            const hour = new Date((item.dt + timezone) * 1000).getUTCHours();
            const bestHour = new Date((best.dt + timezone) * 1000).getUTCHours();
            return Math.abs(hour - 12) < Math.abs(bestHour - 12) ? item : best;
        });

        const card = document.createElement("article");
        card.className = "forecast-day";

        const day = document.createElement("div");
        day.className = "day-name";
        day.textContent = new Date(`${date}T12:00:00Z`).toLocaleDateString(
            undefined,
            { weekday: "short", timeZone: "UTC" }
        );

        const icon = document.createElement("img");
        icon.src = `https://openweathermap.org/img/wn/${representative.weather[0].icon}.png`;
        icon.alt = representative.weather[0].description;
        icon.loading = "lazy";

        const temp = document.createElement("div");
        temp.className = "day-temp";
        temp.textContent = `${Math.round(representative.main.temp_max)}° / ${Math.round(representative.main.temp_min)}°`;

        const description = document.createElement("div");
        description.className = "day-description";
        description.textContent = representative.weather[0].description;

        card.append(day, icon, temp, description);
        forecastList.appendChild(card);
    });
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    const city = cityInput.value.trim();

    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    getWeather(city);
});

updateMoonPhase();
renderRecentCities();




