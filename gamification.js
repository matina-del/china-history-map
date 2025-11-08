// 游戏化系统：积分、成就、排行榜
let userStats = {
    totalPoints: 0,
    visitedProvinces: [],
    learnedEvents: [],
    achievements: [],
    loginHistory: [],
    lastLoginDate: null
};

// 虚拟用户数据（用于排行榜）
const virtualUsers = [
    { name: '历史学者', points: 1250, avatar: '👨‍🏫' },
    { name: '文化探索者', points: 980, avatar: '🧳' },
    { name: '时光旅行者', points: 850, avatar: '⏰' },
    { name: '古都爱好者', points: 720, avatar: '🏛️' },
    { name: '历史新手', points: 450, avatar: '📚' }
];

// 成就定义
const achievements = [
    {
        id: 'first_visit',
        name: '历史新手',
        description: '首次访问历史事件',
        icon: '🌱',
        condition: (stats) => stats.learnedEvents.length >= 1,
        points: 10
    },
    {
        id: 'explorer',
        name: '探索者',
        description: '访问10个历史事件',
        icon: '🗺️',
        condition: (stats) => stats.learnedEvents.length >= 10,
        points: 50
    },
    {
        id: 'scholar',
        name: '历史学者',
        description: '访问50个历史事件',
        icon: '📖',
        condition: (stats) => stats.learnedEvents.length >= 50,
        points: 200
    },
    {
        id: 'master',
        name: '历史大师',
        description: '访问100个历史事件',
        icon: '👑',
        condition: (stats) => stats.learnedEvents.length >= 100,
        points: 500
    },
    {
        id: 'collector',
        name: '收藏家',
        description: '收藏10个历史事件',
        icon: '⭐',
        condition: (stats) => {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            return favorites.length >= 10;
        },
        points: 100
    },
    {
        id: 'quiz_master',
        name: '问答大师',
        description: '连续答题7天',
        icon: '🎯',
        condition: (stats) => {
            const quizData = JSON.parse(localStorage.getItem('quiz_data') || '{}');
            return quizData.consecutiveDays >= 7;
        },
        points: 150
    },
    {
        id: 'traveler',
        name: '旅行者',
        description: '访问10个省份',
        icon: '✈️',
        condition: (stats) => stats.visitedProvinces.length >= 10,
        points: 200
    },
    {
        id: 'perfect_week',
        name: '完美一周',
        description: '连续7天登录',
        icon: '📅',
        condition: (stats) => {
            const loginDays = stats.loginHistory.filter((date, index, arr) => {
                if (index === 0) return true;
                const prevDate = new Date(arr[index - 1]);
                const currDate = new Date(date);
                const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
                return diffDays === 1;
            });
            return loginDays.length >= 7;
        },
        points: 300
    }
];

// 初始化游戏化系统
function initGamification() {
    loadUserStats();
    checkDailyLogin();
    checkAchievements();
    updatePointsDisplay();
    updateAchievementsDisplay();
    updateLeaderboard();
    updateProgressDisplay();
}

// 更新学习进度显示
function updateProgressDisplay() {
    const progress = getLearningProgress();
    const progressBar = document.getElementById('learning-progress-bar');
    const progressText = document.getElementById('learning-progress-text');
    const visitedProvinces = document.getElementById('visited-provinces');
    const learnedEvents = document.getElementById('learned-events');
    const totalPoints = document.getElementById('total-points');
    
    if (progressBar && progressText) {
        setTimeout(() => {
            progressBar.style.width = progress.progress + '%';
            progressText.textContent = progress.progress + '%';
        }, 100);
    }
    if (visitedProvinces) {
        visitedProvinces.textContent = `${progress.visitedProvinces}/${progress.totalProvinces}`;
    }
    if (learnedEvents) {
        learnedEvents.textContent = progress.learnedCount;
    }
    if (totalPoints) {
        totalPoints.textContent = userStats.totalPoints;
    }
}

// 加载用户数据
function loadUserStats() {
    const stored = localStorage.getItem('user_stats');
    if (stored) {
        userStats = JSON.parse(stored);
    } else {
        userStats = {
            totalPoints: 0,
            visitedProvinces: [],
            learnedEvents: [],
            achievements: [],
            loginHistory: [],
            lastLoginDate: null
        };
        saveUserStats();
    }
}

// 保存用户数据
function saveUserStats() {
    localStorage.setItem('user_stats', JSON.stringify(userStats));
}

// 检查每日登录
function checkDailyLogin() {
    const today = new Date().toDateString();
    
    if (userStats.lastLoginDate !== today) {
        // 检查是否连续登录
        if (userStats.lastLoginDate) {
            const yesterday = new Date(userStats.lastLoginDate);
            const todayDate = new Date(today);
            const diffTime = todayDate - yesterday;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // 连续登录，奖励积分
                addPoints(3, '连续登录');
            }
        }
        
        userStats.lastLoginDate = today;
        if (!userStats.loginHistory.includes(today)) {
            userStats.loginHistory.push(today);
        }
        saveUserStats();
        checkAchievements();
    }
}

// 增加积分
function addPoints(points, reason = '') {
    userStats.totalPoints += points;
    saveUserStats();
    updatePointsDisplay();
    
    // 显示积分提示
    showPointsNotification(points, reason);
    
    // 检查成就
    checkAchievements();
}

// 显示积分提示
function showPointsNotification(points, reason) {
    const notification = document.createElement('div');
    notification.className = 'points-notification';
    notification.innerHTML = `
        <span class="points-icon">+${points}</span>
        <span class="points-reason">${reason}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// 记录访问省份
function recordProvinceVisit(province) {
    if (!userStats.visitedProvinces.includes(province)) {
        userStats.visitedProvinces.push(province);
        addPoints(1, '探索新省份');
        saveUserStats();
        checkAchievements();
    }
}

// 记录学习事件
function recordEventLearn(eventId, city, itemTitle) {
    const eventKey = `${city}-${itemTitle}`;
    if (!userStats.learnedEvents.includes(eventKey)) {
        userStats.learnedEvents.push(eventKey);
        addPoints(1, '学习历史事件');
        saveUserStats();
        checkAchievements();
    }
}

// 记录收藏
function recordFavorite(city, itemTitle) {
    addPoints(2, '收藏历史事件');
    checkAchievements();
}

// 检查成就
function checkAchievements() {
    achievements.forEach(achievement => {
        if (!userStats.achievements.includes(achievement.id)) {
            if (achievement.condition(userStats)) {
                unlockAchievement(achievement);
            }
        }
    });
}

// 解锁成就
function unlockAchievement(achievement) {
    userStats.achievements.push(achievement.id);
    addPoints(achievement.points, `解锁成就：${achievement.name}`);
    saveUserStats();
    
    // 显示成就通知
    showAchievementNotification(achievement);
    updateAchievementsDisplay();
}

// 显示成就通知
function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
            <div class="achievement-title">🎉 解锁成就！</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 4000);
}

// 更新积分显示
function updatePointsDisplay() {
    const pointsDisplay = document.getElementById('points-display');
    if (pointsDisplay) {
        pointsDisplay.textContent = userStats.totalPoints;
    }
}

// 更新成就显示
function updateAchievementsDisplay() {
    const achievementsList = document.getElementById('achievements-list');
    if (!achievementsList) return;
    
    achievementsList.innerHTML = '';
    
    achievements.forEach(achievement => {
        const isUnlocked = userStats.achievements.includes(achievement.id);
        const achievementEl = document.createElement('div');
        achievementEl.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        achievementEl.innerHTML = `
            <div class="achievement-icon-large">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name-item">${achievement.name}</div>
                <div class="achievement-desc-item">${achievement.description}</div>
                ${isUnlocked ? `<div class="achievement-points">+${achievement.points}分</div>` : ''}
            </div>
        `;
        achievementsList.appendChild(achievementEl);
    });
}

// 更新排行榜
function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    
    // 合并虚拟用户和当前用户
    const allUsers = [
        ...virtualUsers,
        { name: '我', points: userStats.totalPoints, avatar: '👤', isCurrentUser: true }
    ].sort((a, b) => b.points - a.points);
    
    leaderboardList.innerHTML = '';
    
    allUsers.forEach((user, index) => {
        const rank = index + 1;
        const item = document.createElement('div');
        item.className = `leaderboard-item ${user.isCurrentUser ? 'current-user' : ''}`;
        item.innerHTML = `
            <div class="leaderboard-rank">${rank}</div>
            <div class="leaderboard-avatar">${user.avatar}</div>
            <div class="leaderboard-name">${user.name}</div>
            <div class="leaderboard-points">${user.points}分</div>
        `;
        leaderboardList.appendChild(item);
    });
}

// 获取学习进度
function getLearningProgress() {
    // 确保historyData已加载
    if (typeof historyData === 'undefined' || !historyData || historyData.length === 0) {
        return {
            totalEvents: 0,
            learnedCount: userStats.learnedEvents.length,
            progress: 0,
            visitedProvinces: userStats.visitedProvinces.length,
            totalProvinces: 34
        };
    }
    
    const totalEvents = historyData.reduce((sum, city) => sum + city.items.length, 0);
    const learnedCount = userStats.learnedEvents.length;
    const progress = totalEvents > 0 ? Math.round((learnedCount / totalEvents) * 100) : 0;
    
    return {
        totalEvents,
        learnedCount,
        progress,
        visitedProvinces: userStats.visitedProvinces.length,
        totalProvinces: 34
    };
}

// 生成学习报告数据（用于图表）
function getLearningReportData() {
    const progress = getLearningProgress();
    
    // 按朝代统计
    const dynastyStats = {};
    if (typeof historyData !== 'undefined' && historyData && historyData.length > 0) {
        userStats.learnedEvents.forEach(eventKey => {
            const [city, itemTitle] = eventKey.split('-');
            const cityData = historyData.find(c => c.city === city);
            if (cityData) {
                const item = cityData.items.find(i => i.title === itemTitle);
                if (item) {
                    const dynasty = item.dynasty;
                    dynastyStats[dynasty] = (dynastyStats[dynasty] || 0) + 1;
                }
            }
        });
    }
    
    return {
        progress,
        dynastyStats,
        pointsHistory: userStats.loginHistory.map((date, index) => ({
            date,
            points: userStats.totalPoints - (userStats.loginHistory.length - index - 1) * 10
        }))
    };
}

// 更新游戏化系统（在main.js中调用）
function updateGamification() {
    updatePointsDisplay();
    updateAchievementsDisplay();
    updateLeaderboard();
}

