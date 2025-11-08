// 主要逻辑
let historyData = [];
let favorites = [];
let currentCityData = null;
let currentPeriod = null;

// 数据缓存键名
const DATA_CACHE_KEY = 'history_data_cache';
const DATA_CACHE_TIME_KEY = 'history_data_cache_time';
const DATA_CACHE_VERSION_KEY = 'history_data_cache_version';
const CACHE_VERSION = '2.0'; // 更新版本号以清除旧缓存
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadHistoryData();
    loadFavorites();
    initEventListeners();
    initMap();
    initImageLazyLoad();
    // 初始化游戏化系统（需要等待historyData加载）
    setTimeout(() => {
        if (typeof initGamification === 'function') {
            initGamification();
        }
        if (typeof initQuiz === 'function') {
            initQuiz();
        }
    }, 500);
});

// 加载历史数据（带缓存）
function loadHistoryData() {
    // 检查缓存版本
    const cacheVersion = localStorage.getItem(DATA_CACHE_VERSION_KEY);
    if (cacheVersion !== CACHE_VERSION) {
        // 版本不匹配，清除旧缓存
        localStorage.removeItem(DATA_CACHE_KEY);
        localStorage.removeItem(DATA_CACHE_TIME_KEY);
        localStorage.setItem(DATA_CACHE_VERSION_KEY, CACHE_VERSION);
    }
    
    // 检查缓存
    const cachedData = localStorage.getItem(DATA_CACHE_KEY);
    const cacheTime = localStorage.getItem(DATA_CACHE_TIME_KEY);
    
    if (cachedData && cacheTime) {
        const now = Date.now();
        const cachedTime = parseInt(cacheTime);
        
        // 如果缓存未过期，使用缓存数据
        if (now - cachedTime < CACHE_DURATION) {
            try {
                historyData = JSON.parse(cachedData);
                return;
            } catch (e) {
                // 解析缓存数据失败，继续从服务器加载
            }
        }
    }
    
    // 从服务器加载数据
    fetch('./data/history-data.json')
        .then(response => response.json())
        .then(data => {
            historyData = data;
            
            // 保存到缓存
            try {
                localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(DATA_CACHE_TIME_KEY, Date.now().toString());
                localStorage.setItem(DATA_CACHE_VERSION_KEY, CACHE_VERSION);
            } catch (e) {
                // 保存数据到缓存失败
            }
        })
        .catch(error => {
            // 如果网络请求失败，尝试使用缓存（即使过期）
            if (cachedData) {
                try {
                    historyData = JSON.parse(cachedData);
                } catch (e) {
                    // 解析过期缓存失败
                }
            }
        });
}

// 初始化事件监听
function initEventListeners() {
    // 省份点击事件
    document.addEventListener('provinceClick', function(e) {
        const province = e.detail.province;
        showProvinceInfo(province);
    });

    // 城市点击事件
    document.addEventListener('cityClick', function(e) {
        const city = e.detail.city;
        showCityInfo(city);
    });

    // 时间轴按钮点击
    const timelineButtons = document.querySelectorAll('.timeline-btn');
    timelineButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const period = this.dataset.period;
            selectPeriod(period);
        });
    });

    // 移动端时间轴选择框
    const timelineSelect = document.getElementById('timeline-select');
    if (timelineSelect) {
        timelineSelect.addEventListener('change', function() {
            const period = this.value;
            if (period) {
                selectPeriod(period);
                // 更新按钮状态
                document.querySelectorAll('.timeline-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.period === period) {
                        btn.classList.add('active');
                    }
                });
            }
        });
    }

    // 搜索功能（使用防抖优化）
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    const debouncedSearch = debounce(function(keyword) {
        if (keyword.length > 0) {
            showSearchSuggestions(keyword);
        } else {
            hideSearchSuggestions();
        }
    }, 300);
    
    searchInput.addEventListener('input', function() {
        const keyword = this.value.trim();
        debouncedSearch(keyword);
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    searchBtn.addEventListener('click', performSearch);

    // 收藏按钮
    const favoritesBtn = document.getElementById('favorites-btn');
    favoritesBtn.addEventListener('click', showFavoritesModal);

    // 问答按钮
    const quizBtn = document.getElementById('quiz-btn');
    if (quizBtn) {
        quizBtn.addEventListener('click', function() {
            if (typeof showDailyQuiz === 'function') {
                showDailyQuiz();
            }
        });
    }

    // 游戏化按钮
    const gamificationBtn = document.getElementById('gamification-btn');
    if (gamificationBtn) {
        gamificationBtn.addEventListener('click', showGamificationModal);
    }

    // 积分显示点击事件（点击积分可以打开游戏化系统）
    const pointsContainer = document.querySelector('.points-container');
    if (pointsContainer) {
        pointsContainer.style.cursor = 'pointer';
        pointsContainer.title = '点击查看积分详情和成就';
        pointsContainer.addEventListener('click', function() {
            showGamificationModal();
            // 默认显示学习进度标签页（显示积分详情）
            setTimeout(() => {
                const progressTab = document.querySelector('.gamification-tab[data-tab="progress"]');
                if (progressTab) {
                    progressTab.click();
                }
            }, 100);
        });
    }

    // 游戏化标签切换
    const gamificationTabs = document.querySelectorAll('.gamification-tab');
    gamificationTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchGamificationTab(targetTab);
        });
    });

    // 排行榜筛选
    const leaderboardFilters = document.querySelectorAll('.leaderboard-filter');
    leaderboardFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            leaderboardFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            if (typeof updateLeaderboard === 'function') {
                updateLeaderboard();
            }
        });
    });

    // 关闭弹窗
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('show');
        });
    });

    // 点击弹窗外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });

    // 深色模式切换
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // 加载保存的主题
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.className = savedTheme + '-theme';
        updateThemeIcon(savedTheme);
        
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.body.className = newTheme + '-theme';
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

// 更新主题图标
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.title = theme === 'dark' ? '切换浅色模式' : '切换深色模式';
    }
}

// 省份名称映射（将地图返回的省份名称转换为数据中的省份名称）
function normalizeProvinceName(provinceName) {
    // 省份名称映射表
    const provinceMap = {
        '北京市': '北京',
        '天津市': '天津',
        '上海市': '上海',
        '重庆市': '重庆',
        '河北省': '河北',
        '山西省': '山西',
        '辽宁省': '辽宁',
        '吉林省': '吉林',
        '黑龙江省': '黑龙江',
        '江苏省': '江苏',
        '浙江省': '浙江',
        '安徽省': '安徽',
        '福建省': '福建',
        '江西省': '江西',
        '山东省': '山东',
        '河南省': '河南',
        '湖北省': '湖北',
        '湖南省': '湖南',
        '广东省': '广东',
        '海南省': '海南',
        '四川省': '四川',
        '贵州省': '贵州',
        '云南省': '云南',
        '陕西省': '陕西',
        '甘肃省': '甘肃',
        '青海省': '青海',
        '台湾省': '台湾',
        '内蒙古自治区': '内蒙古',
        '广西壮族自治区': '广西',
        '西藏自治区': '西藏',
        '宁夏回族自治区': '宁夏',
        '新疆维吾尔自治区': '新疆',
        '香港特别行政区': '香港',
        '澳门特别行政区': '澳门'
    };
    
    // 如果直接匹配，返回
    if (provinceMap[provinceName]) {
        return provinceMap[provinceName];
    }
    
    // 如果去掉后缀后匹配，返回
    const withoutSuffix = provinceName.replace(/省|市|自治区|特别行政区/g, '');
    if (provinceMap[provinceName] || historyData.some(item => item.province === withoutSuffix)) {
        return withoutSuffix;
    }
    
    // 尝试模糊匹配
    for (const [key, value] of Object.entries(provinceMap)) {
        if (key.includes(provinceName) || provinceName.includes(key.replace(/省|市|自治区|特别行政区/g, ''))) {
            return value;
        }
    }
    
    // 如果都不匹配，返回原名称
    return provinceName;
}

// 显示省份信息
function showProvinceInfo(province) {
    // 检查数据是否已加载
    if (!historyData || historyData.length === 0) {
        setTimeout(() => showProvinceInfo(province), 500);
        return;
    }
    
    // 标准化省份名称
    const normalizedProvince = normalizeProvinceName(province);
    
    // 先尝试精确匹配
    let cities = historyData.filter(item => item.province === normalizedProvince);
    
    // 如果精确匹配失败，尝试模糊匹配
    if (cities.length === 0) {
        cities = historyData.filter(item => 
            item.province.includes(normalizedProvince) || 
            normalizedProvince.includes(item.province)
        );
    }
    
    if (cities.length === 0) {
        showDefaultInfo();
        return;
    }

    // 显示第一个城市的信息
    showCityInfo(cities[0].city);
}

// 显示城市信息
function showCityInfo(cityName) {
    // 检查数据是否已加载
    if (!historyData || historyData.length === 0) {
        setTimeout(() => showCityInfo(cityName), 500);
        return;
    }
    
    const cityData = historyData.find(item => item.city === cityName);
    if (!cityData) {
        showDefaultInfo();
        return;
    }

    currentCityData = cityData;
    renderCityInfo(cityData);
    
    // 记录学习事件
    if (typeof recordEventLearn === 'function') {
        cityData.items.forEach(item => {
            recordEventLearn(item.title, cityData.city, item.title);
        });
    }
    
    // 记录省份访问
    if (typeof recordProvinceVisit === 'function') {
        recordProvinceVisit(cityData.province);
    }
    
    // 定位到城市
    if (cityData.coordinates) {
        locateCity(cityData.coordinates);
    }
}

// 渲染城市信息
function renderCityInfo(cityData) {
    const infoPanel = document.getElementById('info-panel');
    
    let html = `
        <div class="city-info">
            <h2 class="city-title">${cityData.city}</h2>
    `;

    cityData.items.forEach((item, index) => {
        const isFavorited = isFavorite(cityData.city, item.title);
        html += `
            <div class="history-item" data-city="${cityData.city}" data-item="${item.title}">
                <div class="item-header">
                    <div>
                        <span class="item-type type-${item.type === '历史事件' ? 'event' : item.type === '标志性建筑' ? 'building' : 'person'}">${item.type}</span>
                        <span class="item-title">${item.title}</span>
                    </div>
                    <button class="favorite-btn ${isFavorited ? 'active' : ''}" data-city="${cityData.city}" data-item="${item.title}">
                        ${isFavorited ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="item-meta">${item.dynasty} · ${item.year}</div>
                <div class="item-description">${item.description}</div>
                <img src="" alt="${item.title}" class="item-image" data-image="${item.image}" data-src="${item.image}" loading="lazy">
                <button class="toggle-btn">展开详情</button>
            </div>
        `;
    });

    html += '</div>';
    infoPanel.innerHTML = html;

    // 隐藏默认信息
    document.querySelector('.info-default')?.remove();

    // 绑定事件
    bindItemEvents();
    
    // 重新初始化图片懒加载
    initImageLazyLoad();
}

// 绑定项目事件
function bindItemEvents() {
    // 展开/收起按钮
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const description = this.previousElementSibling.previousElementSibling;
            const isExpanded = description.classList.contains('expanded');
            
            if (isExpanded) {
                description.classList.remove('expanded');
                this.textContent = '展开详情';
            } else {
                description.classList.add('expanded');
                this.textContent = '收起详情';
            }
        });
    });

    // 图片点击放大
    const images = document.querySelectorAll('.item-image');
    images.forEach(img => {
        img.addEventListener('click', function() {
            const imageUrl = this.dataset.image;
            showImageModal(imageUrl);
        });
    });

    // 收藏按钮
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const city = this.dataset.city;
            const item = this.dataset.item;
            toggleFavorite(city, item);
        });
    });
}

// 显示默认信息
function showDefaultInfo() {
    const infoPanel = document.getElementById('info-panel');
    infoPanel.innerHTML = `
        <div class="info-default">
            <h2>欢迎来到华夏史迹</h2>
            <p>点击地图上的省份，探索该地的历史故事</p>
            <p>您可以了解重大历史事件、标志性建筑、历史人物</p>
            <div class="decoration">🏛️</div>
        </div>
    `;
}

// 选择时期
function selectPeriod(period) {
    currentPeriod = period;
    
    // 更新按钮状态
    document.querySelectorAll('.timeline-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });

    // 筛选该时期的数据
    const periodData = [];
    const periodItems = [];

    historyData.forEach(city => {
        city.items.forEach(item => {
            if (isItemInPeriod(item, period)) {
                periodData.push({
                    name: city.city,
                    value: city.coordinates,
                    item: item,
                    province: city.province  // 添加省份信息，用于高亮显示
                });
                periodItems.push({
                    city: city.city,
                    item: item
                });
            }
        });
    });

    // 显示时期数据（传递当前时期以显示版图）
    showPeriodData(periodData, period);

    // 更新信息面板
    if (periodItems.length > 0) {
        renderPeriodInfo(period, periodItems);
    } else {
        showDefaultInfo();
    }
}

// 判断项目是否属于某个时期
function isItemInPeriod(item, period) {
    const periodMap = {
        '夏商周': ['夏', '商', '周'],
        '秦汉': ['秦', '汉'],
        '魏晋南北朝': ['魏', '晋', '南北朝'],
        '隋唐': ['隋', '唐'],
        '宋元': ['宋', '元'],
        '明清': ['明', '清'],
        '近代': ['近代', '1840', '1949'],
        '现代': ['现代', '1949']
    };

    const keywords = periodMap[period] || [];
    return keywords.some(keyword => 
        item.dynasty.includes(keyword) || 
        item.year.includes(keyword)
    );
}

// 渲染时期信息
function renderPeriodInfo(period, items) {
    const infoPanel = document.getElementById('info-panel');
    
    let html = `
        <div class="city-info">
            <h2 class="city-title">${period}时期</h2>
    `;

    items.forEach(({ city, item }) => {
        const isFavorited = isFavorite(city, item.title);
        html += `
            <div class="history-item" data-city="${city}" data-item="${item.title}">
                <div class="item-header">
                    <div>
                        <span class="item-type type-${item.type === '历史事件' ? 'event' : item.type === '标志性建筑' ? 'building' : 'person'}">${item.type}</span>
                        <span class="item-title">${item.title}</span>
                        <span style="color: #999; font-size: 14px;"> · ${city}</span>
                    </div>
                    <button class="favorite-btn ${isFavorited ? 'active' : ''}" data-city="${city}" data-item="${item.title}">
                        ${isFavorited ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="item-meta">${item.dynasty} · ${item.year}</div>
                <div class="item-description">${item.description}</div>
                <img src="" alt="${item.title}" class="item-image" data-image="${item.image}" data-src="${item.image}" loading="lazy">
                <button class="toggle-btn">展开详情</button>
            </div>
        `;
    });

    html += '</div>';
    infoPanel.innerHTML = html;

    bindItemEvents();
    
    // 重新初始化图片懒加载
    initImageLazyLoad();
}

// 搜索功能
function showSearchSuggestions(keyword) {
    const suggestions = [];
    const lowerKeyword = keyword.toLowerCase();

    historyData.forEach(city => {
        // 搜索城市名
        if (city.city.toLowerCase().includes(lowerKeyword)) {
            suggestions.push({
                type: 'city',
                name: city.city,
                data: city
            });
        }

        // 搜索历史项目
        city.items.forEach(item => {
            if (item.title.toLowerCase().includes(lowerKeyword) ||
                item.description.toLowerCase().includes(lowerKeyword)) {
                suggestions.push({
                    type: 'item',
                    name: `${item.title} (${city.city})`,
                    data: { city: city.city, item: item }
                });
            }
        });
    });

    // 去重并限制数量
    const uniqueSuggestions = [];
    const seen = new Set();
    suggestions.forEach(s => {
        const key = s.name;
        if (!seen.has(key) && uniqueSuggestions.length < 5) {
            seen.add(key);
            uniqueSuggestions.push(s);
        }
    });

    renderSearchSuggestions(uniqueSuggestions);
}

function renderSearchSuggestions(suggestions) {
    const container = document.getElementById('search-suggestions');
    
    if (suggestions.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = suggestions.map(s => 
        `<div class="suggestion-item" data-type="${s.type}">${s.name}</div>`
    ).join('');

    container.style.display = 'block';

    // 绑定点击事件
    container.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const index = Array.from(this.parentElement.children).indexOf(this);
            const suggestion = suggestions[index];
            
            if (suggestion.type === 'city') {
                showCityInfo(suggestion.data.city);
            } else {
                showCityInfo(suggestion.data.city);
                // 可以进一步定位到具体项目
            }
            
            hideSearchSuggestions();
            document.getElementById('search-input').value = '';
        });
    });
}

function hideSearchSuggestions() {
    document.getElementById('search-suggestions').style.display = 'none';
}

function performSearch() {
    const keyword = document.getElementById('search-input').value.trim();
    if (!keyword) return;

    hideSearchSuggestions();

    const results = [];
    const lowerKeyword = keyword.toLowerCase();

    historyData.forEach(city => {
        if (city.city.toLowerCase().includes(lowerKeyword)) {
            results.push({ type: 'city', data: city });
        }

        city.items.forEach(item => {
            if (item.title.toLowerCase().includes(lowerKeyword) ||
                item.description.toLowerCase().includes(lowerKeyword)) {
                results.push({ type: 'item', data: { city: city.city, item: item } });
            }
        });
    });

    if (results.length > 0) {
        const firstResult = results[0];
        if (firstResult.type === 'city') {
            showCityInfo(firstResult.data.city);
        } else {
            showCityInfo(firstResult.data.city);
        }
    } else {
        alert('未找到相关历史信息');
    }
}

// 收藏功能
function loadFavorites() {
    const stored = localStorage.getItem('favorites');
    if (stored) {
        favorites = JSON.parse(stored);
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function toggleFavorite(city, item) {
    const key = `${city}-${item}`;
    const index = favorites.findIndex(f => f.key === key);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({ key, city, item });
        // 记录收藏积分
        if (typeof recordFavorite === 'function') {
            recordFavorite(city, item);
        }
    }
    
    saveFavorites();
    updateFavoriteButtons();
    
    // 如果当前显示的是该城市，更新按钮状态
    if (currentCityData && currentCityData.city === city) {
        renderCityInfo(currentCityData);
    }
}

function isFavorite(city, item) {
    const key = `${city}-${item}`;
    return favorites.some(f => f.key === key);
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const city = btn.dataset.city;
        const item = btn.dataset.item;
        const favorited = isFavorite(city, item);
        
        btn.classList.toggle('active', favorited);
        btn.textContent = favorited ? '❤️' : '🤍';
    });
}

function showFavoritesModal() {
    const modal = document.getElementById('favorites-modal');
    const list = document.getElementById('favorites-list');
    
    if (favorites.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暂无收藏</p>';
    } else {
        list.innerHTML = favorites.map(fav => {
            const cityData = historyData.find(c => c.city === fav.city);
            const item = cityData?.items.find(i => i.title === fav.item);
            
            return `
                <div class="favorite-item" data-city="${fav.city}" data-item="${fav.item}">
                    <div class="favorite-item-title">${fav.item}</div>
                    <div class="favorite-item-location">📍 ${fav.city}</div>
                    <button class="favorite-btn" style="float: right; margin-top: -30px;" data-city="${fav.city}" data-item="${fav.item}">❌</button>
                </div>
            `;
        }).join('');
        
        // 绑定事件
        list.querySelectorAll('.favorite-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('favorite-btn')) {
                    e.stopPropagation();
                    const city = this.dataset.city;
                    const item = this.dataset.item;
                    toggleFavorite(city, item);
                    showFavoritesModal(); // 刷新列表
                } else {
                    const city = this.dataset.city;
                    showCityInfo(city);
                    modal.classList.remove('show');
                }
            });
        });
    }
    
    modal.classList.add('show');
}

// 图片懒加载初始化
function initImageLazyLoad() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const dataSrc = img.getAttribute('data-src');
                    if (dataSrc) {
                        img.src = dataSrc;
                        img.classList.add('loaded');
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });

        // 观察所有图片
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // 降级方案：直接加载所有图片
        document.querySelectorAll('img[data-src]').forEach(img => {
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
                img.src = dataSrc;
                img.classList.add('loaded');
            }
        });
    }
}

// 图片放大
function showImageModal(imageUrl) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('modal-image');
    
    // 使用requestAnimationFrame优化动画
    requestAnimationFrame(() => {
        img.src = imageUrl;
        modal.classList.add('show');
    });
}

// 显示游戏化弹窗
function showGamificationModal() {
    const modal = document.getElementById('gamification-modal');
    if (!modal) return;
    
    // 更新学习进度
    if (typeof getLearningProgress === 'function') {
        const progress = getLearningProgress();
        const progressBar = document.getElementById('learning-progress-bar');
        const progressText = document.getElementById('learning-progress-text');
        const visitedProvinces = document.getElementById('visited-provinces');
        const learnedEvents = document.getElementById('learned-events');
        const totalPoints = document.getElementById('total-points');
        
        if (progressBar && progressText) {
            progressBar.style.width = progress.progress + '%';
            progressText.textContent = progress.progress + '%';
        }
        if (visitedProvinces) {
            visitedProvinces.textContent = `${progress.visitedProvinces}/${progress.totalProvinces}`;
        }
        if (learnedEvents) {
            learnedEvents.textContent = progress.learnedCount;
        }
        if (totalPoints && typeof userStats !== 'undefined') {
            totalPoints.textContent = userStats.totalPoints;
        }
    }
    
    // 更新成就和排行榜
    if (typeof updateGamification === 'function') {
        updateGamification();
    }
    
    modal.classList.add('show');
}

// 切换游戏化标签
function switchGamificationTab(tabName) {
    // 更新标签状态
    document.querySelectorAll('.gamification-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    });
    
    // 如果切换到进度标签，更新进度数据
    if (tabName === 'progress' && typeof getLearningProgress === 'function') {
        const progress = getLearningProgress();
        const progressBar = document.getElementById('learning-progress-bar');
        const progressText = document.getElementById('learning-progress-text');
        const visitedProvinces = document.getElementById('visited-provinces');
        const learnedEvents = document.getElementById('learned-events');
        const totalPoints = document.getElementById('total-points');
        
        if (progressBar && progressText) {
            progressBar.style.width = progress.progress + '%';
            progressText.textContent = progress.progress + '%';
        }
        if (visitedProvinces) {
            visitedProvinces.textContent = `${progress.visitedProvinces}/${progress.totalProvinces}`;
        }
        if (learnedEvents) {
            learnedEvents.textContent = progress.learnedCount;
        }
        if (totalPoints && typeof userStats !== 'undefined') {
            totalPoints.textContent = userStats.totalPoints;
        }
    }
}

