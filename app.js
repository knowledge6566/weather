const API_KEY = '974f20c209985a30092487b0c6659988';
const BASE    = 'https://api.openweathermap.org';

let state = {
  unit: 'metric',
  theme: 'dark',
  currentData: null,
  forecastData: null,
  history: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
  favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
};

const $ = id => document.getElementById(id);
const searchInput     = $('searchInput');
const searchBtn       = $('searchBtn');
const themeToggle     = $('themeToggle');
const unitToggle      = $('unitToggle');
const unitLabel       = $('unitLabel');
const errorBanner     = $('errorBanner');
const loadingState    = $('loadingState');
const weatherContent  = $('weatherContent');
const emptyState      = $('emptyState');
const particles       = $('particles');
const cityName        = $('cityName');
const countryCode     = $('countryCode');
const weatherDate     = $('weatherDate');
const tempValue       = $('tempValue');
const feelsLike       = $('feelsLike');
const conditionText   = $('conditionText');
const weatherIconMain = $('weatherIconMain');
const humidityVal     = $('humidityVal');
const humidityBar     = $('humidityBar');
const windVal         = $('windVal');
const windArrow       = $('windArrow');
const visibilityVal   = $('visibilityVal');
const pressureVal     = $('pressureVal');
const sunriseVal      = $('sunriseVal');
const sunsetVal       = $('sunsetVal');
const sunDot          = $('sunDot');
const cloudVal        = $('cloudVal');
const cloudBar        = $('cloudBar');
const forecastStrip   = $('forecastStrip');
const hourlyStrip     = $('hourlyStrip');

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function iconURL(code, size) {
  size = size || '@2x';
  return 'https://openweathermap.org/img/wn/' + code + size + '.png';
}
function unitSuffix() { return state.unit === 'metric' ? 'C' : 'F'; }
function speedUnit()  { return state.unit === 'metric' ? 'm/s' : 'mph'; }
function formatTime(unix, offset) {
  offset = offset || 0;
  const d = new Date((unix + offset) * 1000);
  return d.toUTCString().slice(17, 22);
}
function formatDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
function formatDay(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}
function degToCompass(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}
function visibilityStr(m) {
  if (m >= 10000) return '10+ km';
  if (m >= 1000)  return (m/1000).toFixed(1) + ' km';
  return m + ' m';
}
function bezierPoint(t) {
  const p0 = {x:5,  y:50};
  const p1 = {x:50, y:5};
  const p2 = {x:95, y:50};
  return {
    x: (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x,
    y: (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y,
  };
}

// â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchWeather(city) {
  const u = state.unit;
  const [curRes, fcRes] = await Promise.all([
    fetch(BASE + '/data/2.5/weather?q=' + encodeURIComponent(city) + '&units=' + u + '&appid=' + API_KEY),
    fetch(BASE + '/data/2.5/forecast?q=' + encodeURIComponent(city) + '&units=' + u + '&cnt=40&appid=' + API_KEY)
  ]);
  if (!curRes.ok) {
    const err = await curRes.json();
    throw new Error(err.message || 'City not found');
  }
  const [curData, fcData] = await Promise.all([curRes.json(), fcRes.json()]);
  return { curData, fcData };
}

async function fetchWeatherByCoords(lat, lon) {
  const u = state.unit;
  const [curRes, fcRes] = await Promise.all([
    fetch(BASE + '/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&units=' + u + '&appid=' + API_KEY),
    fetch(BASE + '/data/2.5/forecast?lat=' + lat + '&lon=' + lon + '&units=' + u + '&cnt=40&appid=' + API_KEY)
  ]);
  if (!curRes.ok) throw new Error('Could not get location weather');
  const [curData, fcData] = await Promise.all([curRes.json(), fcRes.json()]);
  return { curData, fcData };
}

async function fetchAirQuality(lat, lon) {
  const res = await fetch(BASE + '/data/2.5/air_pollution?lat=' + lat + '&lon=' + lon + '&appid=' + API_KEY);
  if (!res.ok) return null;
  return res.json();
}

// â”€â”€ Weather Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function checkWeatherAlerts(d) {
  const alerts = [];
  const temp      = d.main.temp;
  const wind      = d.wind.speed;
  const weatherId = d.weather[0].id;

  if (temp >= 40)  alerts.push({ icon: 'fire',    msg: 'Extreme heat warning! Stay hydrated and avoid direct sunlight.' });
  if (temp <= 0)   alerts.push({ icon: 'cold',    msg: 'Freezing temperatures! Dress warmly and watch for ice.' });
  if (wind >= 15)  alerts.push({ icon: 'wind',    msg: 'Strong winds warning! Secure loose objects outdoors.' });
  if (wind >= 25)  alerts.push({ icon: 'storm',   msg: 'Dangerous wind speeds! Avoid outdoor activities.' });
  if (weatherId >= 200 && weatherId < 300) alerts.push({ icon: 'thunder', msg: 'Thunderstorm alert! Stay indoors and away from windows.' });
  if (weatherId >= 500 && weatherId < 510) alerts.push({ icon: 'rain',   msg: 'Heavy rain expected. Carry an umbrella and watch for flooding.' });
  if (weatherId >= 600 && weatherId < 700) alerts.push({ icon: 'snow',   msg: 'Snowfall alert! Roads may be slippery. Drive carefully.' });
  if (d.main.humidity > 90) alerts.push({ icon: 'humid', msg: 'Very high humidity. May feel uncomfortable outdoors.' });
  if (d.visibility && d.visibility < 1000) alerts.push({ icon: 'fog',   msg: 'Low visibility warning! Drive slowly and use fog lights.' });

  renderAlerts(alerts);
}

const ALERT_ICONS = {
  fire: '&#128293;', cold: '&#129398;', wind: '&#128168;',
  storm: '&#127754;', thunder: '&#9928;', rain: '&#127783;',
  snow: '&#10052;', humid: '&#128167;', fog: '&#127787;'
};

function renderAlerts(alerts) {
  const container = $('alertsContainer');
  if (!container) return;
  if (alerts.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';
  container.innerHTML = alerts.map(function(a) {
    return '<div class="alert-card">' +
      '<span class="alert-icon">' + (ALERT_ICONS[a.icon] || '') + '</span>' +
      '<span class="alert-msg">' + a.msg + '</span>' +
      '</div>';
  }).join('');
}

// â”€â”€ Air Quality â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderAirQuality(data) {
  const container = $('aqiContainer');
  if (!container || !data) return;
  const aqi        = data.list[0].main.aqi;
  const components = data.list[0].components;
  const aqiLabels  = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  const aqiColors  = ['', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];
  const aqiFaces   = ['', ':)', ':|', ':-/', ':(', 'X('];
  container.style.display = 'block';
  container.innerHTML =
    '<div class="aqi-card">' +
      '<div class="aqi-header">' +
        '<div class="aqi-icon">&#127787;</div>' +
        '<div class="aqi-title">' +
          '<span class="stat-label">Air Quality Index</span>' +
          '<span class="aqi-value" style="color:' + aqiColors[aqi] + '">' + aqiLabels[aqi] + '</span>' +
        '</div>' +
        '<div class="aqi-badge" style="background:' + aqiColors[aqi] + '20;color:' + aqiColors[aqi] + ';border:1px solid ' + aqiColors[aqi] + '40">AQI ' + aqi + '</div>' +
      '</div>' +
      '<div class="aqi-bar-wrap">' +
        '<div class="aqi-bar"><div class="aqi-bar-fill" style="width:' + ((aqi/5)*100) + '%;background:' + aqiColors[aqi] + '"></div></div>' +
        '<div class="aqi-labels"><span>Good</span><span>Fair</span><span>Moderate</span><span>Poor</span><span>Very Poor</span></div>' +
      '</div>' +
      '<div class="aqi-components">' +
        '<div class="aqi-comp"><span>CO</span><strong>' + components.co.toFixed(1) + '</strong></div>' +
        '<div class="aqi-comp"><span>NO2</span><strong>' + components.no2.toFixed(1) + '</strong></div>' +
        '<div class="aqi-comp"><span>O3</span><strong>' + components.o3.toFixed(1) + '</strong></div>' +
        '<div class="aqi-comp"><span>PM2.5</span><strong>' + components.pm2_5.toFixed(1) + '</strong></div>' +
        '<div class="aqi-comp"><span>PM10</span><strong>' + components.pm10.toFixed(1) + '</strong></div>' +
        '<div class="aqi-comp"><span>SO2</span><strong>' + components.so2.toFixed(1) + '</strong></div>' +
      '</div>' +
    '</div>';
}

// â”€â”€ Weather Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderWeatherMap(lat, lon) {
  const container = $('mapContainer');
  if (!container) return;
  container.style.display = 'block';
  container.innerHTML =
    '<div class="map-card">' +
      '<div class="map-header">' +
        '<span class="section-title">Weather Map</span>' +
        '<div class="map-layer-btns">' +
          '<button class="map-btn active" onclick="switchMapLayer(\'precipitation\', this)">Rain</button>' +
          '<button class="map-btn" onclick="switchMapLayer(\'clouds\', this)">Clouds</button>' +
          '<button class="map-btn" onclick="switchMapLayer(\'wind\', this)">Wind</button>' +
          '<button class="map-btn" onclick="switchMapLayer(\'temperature\', this)">Temp</button>' +
        '</div>' +
      '</div>' +
      '<div class="map-wrap">' +
        '<iframe id="weatherMapFrame"' +
        ' src="https://openweathermap.org/weathermap?basemap=map&cities=true&layer=precipitation&lat=' + lat + '&lon=' + lon + '&zoom=8"' +
        ' width="100%" height="400" style="border:none;border-radius:12px;" loading="lazy"></iframe>' +
      '</div>' +
    '</div>';
}

window.switchMapLayer = function(layer, btn) {
  document.querySelectorAll('.map-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  const frame = $('weatherMapFrame');
  if (frame) {
    frame.src = frame.src.replace(/layer=[^&]+/, 'layer=' + layer);
  }
};

// â”€â”€ Search History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function addToHistory(city) {
  state.history = [city].concat(state.history.filter(function(c) {
    return c.toLowerCase() !== city.toLowerCase();
  })).slice(0, 5);
  localStorage.setItem('searchHistory', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  const container = $('historyContainer');
  if (!container || state.history.length === 0) {
    if (container) container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  const chips = state.history.map(function(city) {
    return '<button class="history-chip" onclick="loadCity(\'' + city + '\')">' + city + '</button>';
  }).join('');
  container.innerHTML = '<h2 class="section-title">Recent Searches</h2><div class="history-strip">' + chips + '</div>';
}

// â”€â”€ Favorites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function toggleFavorite(city) {
  const idx = state.favorites.findIndex(function(c) {
    return c.toLowerCase() === city.toLowerCase();
  });
  if (idx === -1) {
    state.favorites.push(city);
  } else {
    state.favorites.splice(idx, 1);
  }
  localStorage.setItem('favorites', JSON.stringify(state.favorites));
  renderFavorites();
  updateFavBtn(city);
}

function isFavorite(city) {
  return state.favorites.some(function(c) {
    return c.toLowerCase() === city.toLowerCase();
  });
}

function updateFavBtn(city) {
  const btn = $('favBtn');
  if (!btn) return;
  if (isFavorite(city)) {
    btn.textContent = '';
    btn.innerHTML = '&#10084;';
    btn.style.color = '#ef4444';
    btn.title = 'Remove from favorites';
  } else {
    btn.innerHTML = '&#9825;';
    btn.style.color = '';
    btn.title = 'Add to favorites';
  }
}

function renderFavorites() {
  const container = $('favoritesContainer');
  if (!container || state.favorites.length === 0) {
    if (container) container.style.display = 'none';
    return;
  }
  const chips = state.favorites.map(function(city) {
    return '<button class="history-chip fav-chip" onclick="loadCity(\'' + city + '\')">' + city + '</button>';
  }).join('');
  container.style.display = 'block';
  container.innerHTML = '<h2 class="section-title">Favorites</h2><div class="history-strip">' + chips + '</div>';
}

// â”€â”€ Render Current â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderCurrent(d) {
  cityName.textContent      = d.name;
  countryCode.textContent   = d.sys.country;
  weatherDate.textContent   = formatDate(d.dt);
  tempValue.textContent     = Math.round(d.main.temp);
  feelsLike.textContent     = 'Feels like ' + Math.round(d.main.feels_like) + '\u00B0' + unitSuffix();
  conditionText.textContent = d.weather[0].description;
  weatherIconMain.src       = iconURL(d.weather[0].icon, '@4x');
  humidityVal.textContent   = d.main.humidity + '%';
  humidityBar.style.width   = d.main.humidity + '%';
  const wind = Math.round(d.wind.speed);
  const wDir = d.wind.deg || 0;
  windVal.textContent       = wind + ' ' + speedUnit() + ' ' + degToCompass(wDir);
  windArrow.style.transform = 'rotate(' + wDir + 'deg)';
  visibilityVal.textContent = d.visibility ? visibilityStr(d.visibility) : '--';
  pressureVal.textContent   = d.main.pressure + ' hPa';
  sunriseVal.textContent    = formatTime(d.sys.sunrise, d.timezone);
  sunsetVal.textContent     = formatTime(d.sys.sunset,  d.timezone);
  const arcT = Math.max(0, Math.min(1, (d.dt - d.sys.sunrise) / (d.sys.sunset - d.sys.sunrise)));
  const pt   = bezierPoint(arcT);
  sunDot.setAttribute('cx', pt.x);
  sunDot.setAttribute('cy', pt.y);
  const clouds = (d.clouds && d.clouds.all) ? d.clouds.all : 0;
  cloudVal.textContent = clouds + '%';
  cloudBar.style.width = clouds + '%';
  checkWeatherAlerts(d);
  updateFavBtn(d.name);
}

// â”€â”€ Render Forecast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderForecast(data) {
  const byDay = {};
  data.list.forEach(function(item) {
    const day = new Date(item.dt * 1000).toLocaleDateString('en-US', {
      weekday: 'short', month: 'numeric', day: 'numeric'
    });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  });
  forecastStrip.innerHTML = Object.entries(byDay).slice(0, 5).map(function(entry, i) {
    const items = entry[1];
    const high  = Math.round(Math.max.apply(null, items.map(function(x) { return x.main.temp_max; })));
    const low   = Math.round(Math.min.apply(null, items.map(function(x) { return x.main.temp_min; })));
    const mid   = items[Math.floor(items.length / 2)];
    return '<div class="forecast-card ' + (i === 0 ? 'today' : '') + '">' +
      '<span class="forecast-day">' + (i === 0 ? 'Today' : formatDay(mid.dt)) + '</span>' +
      '<img class="forecast-icon" src="' + iconURL(mid.weather[0].icon) + '" alt="' + mid.weather[0].description + '" />' +
      '<div class="forecast-temps">' +
        '<span class="forecast-high">' + high + '&deg;</span>' +
        '<span class="forecast-low">' + low + '&deg;</span>' +
      '</div>' +
      '<span class="forecast-desc">' + mid.weather[0].description + '</span>' +
      '</div>';
  }).join('');
}

// â”€â”€ Render Hourly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderHourly(data) {
  hourlyStrip.innerHTML = data.list.slice(0, 12).map(function(item, i) {
    const hour = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    return '<div class="hourly-card ' + (i === 0 ? 'now' : '') + '">' +
      '<span class="hourly-time">' + (i === 0 ? 'Now' : hour) + '</span>' +
      '<img class="hourly-icon" src="' + iconURL(item.weather[0].icon) + '" alt="" />' +
      '<span class="hourly-temp">' + Math.round(item.main.temp) + '&deg;</span>' +
      '</div>';
  }).join('');
}

// â”€â”€ UI Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showLoading() {
  loadingState.classList.add('active');
  weatherContent.hidden = true;
  emptyState.style.display = 'none';
  errorBanner.classList.remove('visible');
}
function hideLoading() { loadingState.classList.remove('active'); }
function showWeather() { weatherContent.hidden = false; emptyState.style.display = 'none'; }
function showEmpty()   { emptyState.style.display = 'flex'; weatherContent.hidden = true; }
function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.add('visible');
  setTimeout(function() { errorBanner.classList.remove('visible'); }, 5000);
}

// â”€â”€ Load City â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    addToHistory(curData.name);
    const lat = curData.coord.lat;
    const lon = curData.coord.lon;
    const aqiData = await fetchAirQuality(lat, lon);
    renderAirQuality(aqiData);
    renderWeatherMap(lat, lon);
    hideLoading();
    showWeather();
    searchInput.value = '';
  } catch (e) {
    hideLoading();
    showError(e.message);
    if (!state.currentData) showEmpty();
    else showWeather();
  }
}

// â”€â”€ Geolocation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getLocation() {
  const btn = $('geoBtn');
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser');
    return;
  }
  if (btn) btn.textContent = '...';
  navigator.geolocation.getCurrentPosition(
    async function(pos) {
      showLoading();
      try {
        const { curData, fcData } = await fetchWeatherByCoords(
          pos.coords.latitude, pos.coords.longitude
        );
        state.currentData  = curData;
        state.forecastData = fcData;
        renderCurrent(curData);
        renderForecast(fcData);
        renderHourly(fcData);
        addToHistory(curData.name);
        const lat     = curData.coord.lat;
        const lon     = curData.coord.lon;
        const aqiData = await fetchAirQuality(lat, lon);
        renderAirQuality(aqiData);
        renderWeatherMap(lat, lon);
        hideLoading();
        showWeather();
        if (btn) btn.innerHTML = '&#128205;';
      } catch (e) {
        hideLoading();
        showError(e.message);
        showEmpty();
        if (btn) btn.innerHTML = '&#128205;';
      }
    },
    function() {
      showError('Location access denied. Please search manually.');
      if (btn) btn.innerHTML = '&#128205;';
    }
  );
}

// â”€â”€ Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
searchBtn.addEventListener('click', function() { loadCity(searchInput.value); });
searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') loadCity(searchInput.value);
});
themeToggle.addEventListener('click', function() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
});
unitToggle.addEventListener('click', function() {
  state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
  unitLabel.textContent = state.unit === 'metric' ? 'C' : 'F';
  if (state.currentData) loadCity(state.currentData.name);
});
const geoBtn = $('geoBtn');
if (geoBtn) geoBtn.addEventListener('click', getLocation);
const favBtn = $('favBtn');
if (favBtn) favBtn.addEventListener('click', function() {
  if (state.currentData) toggleFavorite(state.currentData.name);
});

// â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
showEmpty();
renderHistory();
renderFavorites();
setTimeout(function() { searchInput.focus(); }, 300);
