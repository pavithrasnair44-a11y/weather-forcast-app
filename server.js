require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.WEATHER_API_KEY;

app.use(express.static(__dirname));

async function getOpenWeatherData(endpoint, city) {
    const url = new URL(
        `https://api.openweathermap.org/data/2.5/${endpoint}`
    );

    url.searchParams.set("q", city);
    url.searchParams.set("appid", API_KEY);
    url.searchParams.set("units", "metric");

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data.message || "Unable to retrieve weather data."
        );
        error.status = response.status;
        throw error;
    }

    return data;
}

async function weatherHandler(endpoint, req, res) {
    const city = (req.query.city || "").trim();

    if (!city) {
        return res.status(400).json({
            error: "Please provide a city name."
        });
    }

    if (!API_KEY) {
        return res.status(500).json({
            error: "Weather API key is not configured on the server."
        });
    }

    try {
        const data = await getOpenWeatherData(endpoint, city);
        res.json(data);
    } catch (error) {
        console.error(`${endpoint} request failed:`, error.message);

        const status = error.status === 404 ? 404 :
            error.status === 401 ? 502 :
            error.status === 429 ? 503 : 502;

        res.status(status).json({
            error: error.status === 404
                ? "City not found. Please try another city."
                : error.status === 401
                    ? "The weather service rejected the API key. Check your key."
                    : error.status === 429
                        ? "The weather service limit was reached. Try again later."
                        : "Unable to retrieve weather data. Please try again."
        });
    }
}

app.get("/api/weather", (req, res) => {
    weatherHandler("weather", req, res);
});

app.get("/api/forecast", (req, res) => {
    weatherHandler("forecast", req, res);
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Weather app running at http://localhost:${PORT}`);
});