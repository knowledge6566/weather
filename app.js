const API_KEY = '974f20c209985a30092487b0c6659988';
const BASE = 'https://api.openweathermap.org';

let state = {
  unit: 'metric',
  theme: 'dark',
  currentData: null,
  forecastData: null,
};

const $ = id => document.getElementById(id);
const searchInput    = $('searchInput');
const searchBtn      = $('searchBtn');
const themeToggle    = $('themeToggle');
const unitToggle     = $('unitToggle');
const unitLabel      = $('unitLabel');
const errorBanner    = $('errorBanner');
const loadingState   = $('loadingState');
const weatherContent = $('weatherContent');
const emptyState     = $('emptyState');
const particles      = $('particles');
const cityName       = $('cityName');
const countryCode    = $('countryCode');
const weatherDate    = $('weatherDate');
const tempValue      = $('tempValue');
const feelsLike      = $('feelsLike');
const conditionText  = $('conditionText');
const weatherIconMain= $('weatherIconMain');
const humidityVal    = $('humidityVal');
const humidityBar    = $('humidityBar');
const windVal        = $('windVal');
const windArrow      = $('windArrow');
const visibilityVal  = $('visibilityVal');
const pressureVal    = $('pressureVal');
const sunriseVal     = $('sunriseVal');
const sunsetVal      = $('sunsetVal');
const sunDot         = $('sunDot');
const cloudVal       = $('cloudVal');
const cloudBar       = $('cloudBar');
const forecastStrip  = $('forecastStrip');
const hourlyStrip    = $('hourlyStrip');

// ── Fetch ──────────────────────────────────────────
async function fetchWeather(city) {
  const u = state.unit;
  const [curRes, fcRes] = await Promise.all([
    fetch(`${BASE}/data/2.5/weather?q=${encodeURIComponent(city)}&units=${u}&appid=${API_KEY}`),
    fetch(`${BASE}/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${u}&cnt=40&appid=${API_KEY}`)
  ]);
  if (!curRes.ok) {
    const err = await curRes.json();
    throw new Error(err.message || 'City not found');
  }
  const [curData, fcData] = await Promise.all([curRes.json(), fcRes.json()]);
  return { curData, fcData };
}

// ── Helpers ────────────────────────────────────────
function iconURL(code, size = '@2x') {
  return `https://openweathermap.org/img/wn/${code}${size}.png`;
}
function unitSuffix() { return state.unit === 'metric' ? 'C' : 'F'; }
function speedUnit()  { return state.unit === 'metric' ? 'm/s' : 'mph'; }
function formatTime(unix, offset = 0) {
  const d = new Date((unix + offset) * 1000);
  return d.toUTCString().slice(17, 22);
}
function formatDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
function formatDay(unix) {
  return new Date(unix * 1000)
    .toLocaleDateString('en-US', { weekday: 'short' })
    .toUpperCase();
}
function degToCompass(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}
function visibilityStr(m) {
  if (m >= 10000) return '10+ km';
  if (m >= 1000)  return `${(m/1000).toFixed(1)} km`;
  return `${m} m`;
}
function bezierPoint(t) {
  const p0={x:5,y:50}, p1={x:50,y:5}, p2={x:95,y:50};
  return {
    x: (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x,
    y: (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y,
  };
}

// ── Render Current ─────────────────────────────────
function renderCurrent(d) {
  cityName.textContent      = d.name;
  countryCode.textContent   = d.sys.country;
  weatherDate.textContent   = formatDate(d.dt);
  tempValue.textContent     = Math.round(d.main.temp);
  feelsLike.textContent     = `Feels like ${Math.round(d.main.feels_like)}°${unitSuffix()}`;
  conditionText.textContent = d.weather[0].description;
  weatherIconMain.src       = iconURL(d.weather[0].icon, '@4x');
  humidityVal.textContent   = `${d.main.humidity}%`;
  humidityBar.style.width   = `${d.main.humidity}%`;
  const wind = Math.round(d.wind.speed);
  const wDir = d.wind.deg || 0;
  windVal.textContent       = `${wind} ${speedUnit()} ${degToCompass(wDir)}`;
  windArrow.style.transform = `rotate(${wDir}deg)`;
  visibilityVal.textContent = d.visibility ? visibilityStr(d.visibility) : '—';
  pressureVal.textContent   = `${d.main.pressure} hPa`;
  sunriseVal.textContent    = formatTime(d.sys.sunrise, d.timezone);
  sunsetVal.textContent     = formatTime(d.sys.sunset, d.timezone);
  const arcT = Math.max(0, Math.min(1,
    (d.dt - d.sys.sunrise) / (d.sys.sunset - d.sys.sunrise)
  ));
  const pt = bezierPoint(arcT);
  sunDot.setAttribute('cx', pt.x);
  sunDot.setAttribute('cy', pt.y);
  const clouds = d.clouds?.all ?? 0;
  cloudVal.textContent  = `${clouds}%`;
  cloudBar.style.width  = `${clouds}%`;
}

// ── Render Forecast ────────────────────────────────
function renderForecast(data) {
  const byDay = {};
  data.list.forEach(item => {
    const day = new Date(item.dt * 1000).toLocaleDateString('en-US', {
      weekday: 'short', month: 'numeric', day: 'numeric'
    });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  });
  forecastStrip.innerHTML = Object.entries(byDay).slice(0, 5).map(([day, items], i) => {
    const high = Math.round(Math.max(...items.map(x => x.main.temp_max)));
    const low  = Math.round(Math.min(...items.map(x => x.main.temp_min)));
    const mid  = items[Math.floor(items.length / 2)];
    return `
      <div class="forecast-card ${i === 0 ? 'today' : ''}">
        <span class="forecast-day">${i === 0 ? 'Today' : formatDay(mid.dt)}</span>
        <img class="forecast-icon" src="${iconURL(mid.weather[0].icon)}" alt="${mid.weather[0].description}" />
        <div class="forecast-temps">
          <span class="forecast-high">${high}°</span>
          <span class="forecast-low">${low}°</span>
        </div>
        <span class="forecast-desc">${mid.weather[0].description}</span>
      </div>`;
  }).join('');
}

// ── Render Hourly ──────────────────────────────────
function renderHourly(data) {
  hourlyStrip.innerHTML = data.list.slice(0, 12).map((item, i) => {
    const hour = new Date(item.dt * 1000)
      .toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    return `
      <div class="hourly-card ${i === 0 ? 'now' : ''}">
        <span class="hourly-time">${i === 0 ? 'Now' : hour}</span>
        <img class="hourly-icon" src="${iconURL(item.weather[0].icon)}" alt="" />
        <span class="hourly-temp">${Math.round(item.main.temp)}°</span>
      </div>`;
  }).join('');
}

// ── UI Helpers ─────────────────────────────────────
function showLoading() {
  loadingState.classList.add('active');
  weatherContent.hidden = true;
  emptyState.style.display = 'none';
  errorBanner.classList.remove('visible');
}
function hideLoading() {
  loadingState.classList.remove('active');
}
function showWeather() {
  weatherContent.hidden = false;
  emptyState.style.display = 'none';
}
function showEmpty() {
  emptyState.style.display = 'flex';
  weatherContent.hidden = true;
}
function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.add('visible');
  setTimeout(() => errorBanner.classList.remove('visible'), 5000);
}

// ── Load City ──────────────────────────────────────
async function loadCity(city) {
  if (!city.trim()) return;
  showLoading();
  try {
    const { curData, fcData } = await fetchWeather(city);
    state.currentData  = curData;
    state.forecastData = fcData;
    renderCurrent(curData);
    renderForecast(fcData);
    renderHourly(fcData);
    hideLoading();
    showWeather();
  } catch (e) {
    hideLoading();
    showError(e.message);
    if (!state.currentData) showEmpty();
    else showWeather();
  }
}

// ── Events ─────────────────────────────────────────
searchBtn.addEventListener('click', () => loadCity(searchInput.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') loadCity(searchInput.value);
});
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
});
unitToggle.addEventListener('click', () => {
  state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
  unitLabel.textContent = state.unit === 'metric' ? '°C' : '°F';
  if (state.currentData) loadCity(state.currentData.name);
});

// ── Init ───────────────────────────────────────────
showEmpty();
setTimeout(() => searchInput.focus(), 300);