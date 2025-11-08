// 每日历史问答功能
let quizData = null;
let currentQuestion = null;
let userAnswers = [];

// 初始化问答系统
function initQuiz() {
    // 等待historyData加载
    if (!historyData || historyData.length === 0) {
        setTimeout(initQuiz, 500);
        return;
    }
    loadQuizData();
    checkDailyQuiz();
    updateQuizUI();
}

// 加载问答数据
function loadQuizData() {
    const stored = localStorage.getItem('quiz_data');
    if (stored) {
        quizData = JSON.parse(stored);
    } else {
        quizData = {
            lastQuizDate: null,
            totalQuestions: 0,
            correctAnswers: 0,
            consecutiveDays: 0,
            lastConsecutiveDate: null,
            answers: []
        };
        saveQuizData();
    }
}

// 保存问答数据
function saveQuizData() {
    localStorage.setItem('quiz_data', JSON.stringify(quizData));
}

// 检查每日问答
function checkDailyQuiz() {
    const today = new Date().toDateString();
    
    if (quizData.lastQuizDate !== today) {
        // 新的一天，生成新题目
        if (quizData.lastQuizDate) {
            const yesterday = new Date(quizData.lastQuizDate);
            const todayDate = new Date(today);
            const diffTime = todayDate - yesterday;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // 连续答题
                quizData.consecutiveDays++;
                quizData.lastConsecutiveDate = today;
            } else if (diffDays > 1) {
                // 中断了连续
                quizData.consecutiveDays = 1;
                quizData.lastConsecutiveDate = today;
            }
        } else {
            quizData.consecutiveDays = 1;
            quizData.lastConsecutiveDate = today;
        }
        
        generateDailyQuestion();
        saveQuizData();
    }
}

// 生成每日题目
function generateDailyQuestion() {
    if (!historyData || historyData.length === 0) {
        return;
    }
    
    // 随机选择一个历史事件
    const allItems = [];
    historyData.forEach(city => {
        city.items.forEach(item => {
            allItems.push({
                ...item,
                city: city.city,
                province: city.province
            });
        });
    });
    
    if (allItems.length === 0) return;
    
    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
    
    // 生成题目
    const questionTypes = [
        {
            type: 'event',
            question: `"${randomItem.title}"发生在哪个朝代？`,
            correct: randomItem.dynasty,
            getOptions: () => {
                // 获取所有不同的朝代
                const allDynasties = [...new Set(allItems.map(item => item.dynasty))];
                // 移除正确答案
                const wrongDynasties = allDynasties.filter(d => d !== randomItem.dynasty);
                // 如果错误选项不够3个，补充一些常见朝代
                const commonDynasties = ['夏', '商', '周', '秦', '汉', '魏晋', '南北朝', '隋', '唐', '宋', '元', '明', '清', '近代', '现代'];
                const availableWrong = [...new Set([...wrongDynasties, ...commonDynasties.filter(d => d !== randomItem.dynasty)])];
                // 随机选择3个错误选项
                const selectedWrong = availableWrong
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                // 合并并打乱，确保去重
                const allOptions = [randomItem.dynasty, ...selectedWrong];
                const uniqueOptions = [...new Set(allOptions)];
                // 如果去重后选项不够4个，补充选项
                while (uniqueOptions.length < 4) {
                    const randomDynasty = commonDynasties[Math.floor(Math.random() * commonDynasties.length)];
                    if (!uniqueOptions.includes(randomDynasty) && randomDynasty !== randomItem.dynasty) {
                        uniqueOptions.push(randomDynasty);
                    }
                }
                return uniqueOptions.slice(0, 4).sort(() => Math.random() - 0.5);
            },
            explanation: `${randomItem.title}发生在${randomItem.dynasty}时期（${randomItem.year}），位于${randomItem.city}。${randomItem.description.substring(0, 100)}...`
        },
        {
            type: 'location',
            question: `"${randomItem.title}"位于哪个城市？`,
            correct: randomItem.city,
            getOptions: () => {
                // 获取所有不同的城市
                const allCities = [...new Set(allItems.map(item => item.city))];
                // 移除正确答案
                const wrongCities = allCities.filter(c => c !== randomItem.city);
                // 如果错误选项不够3个，补充一些常见城市
                const commonCities = ['北京', '上海', '西安', '南京', '杭州', '成都', '广州', '武汉', '重庆', '天津'];
                const availableWrong = [...new Set([...wrongCities, ...commonCities.filter(c => c !== randomItem.city)])];
                // 随机选择3个错误选项
                const selectedWrong = availableWrong
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                // 合并并打乱，确保去重
                const allOptions = [randomItem.city, ...selectedWrong];
                const uniqueOptions = [...new Set(allOptions)];
                // 如果去重后选项不够4个，补充选项
                while (uniqueOptions.length < 4) {
                    const randomCity = commonCities[Math.floor(Math.random() * commonCities.length)];
                    if (!uniqueOptions.includes(randomCity) && randomCity !== randomItem.city) {
                        uniqueOptions.push(randomCity);
                    }
                }
                return uniqueOptions.slice(0, 4).sort(() => Math.random() - 0.5);
            },
            explanation: `${randomItem.title}位于${randomItem.city}（${randomItem.province}），发生在${randomItem.dynasty}时期。${randomItem.description.substring(0, 100)}...`
        },
        {
            type: 'year',
            question: `"${randomItem.title}"发生在哪一年？`,
            correct: randomItem.year,
            getOptions: () => {
                // 获取所有不同的年份
                const allYears = [...new Set(allItems.map(item => item.year))];
                // 移除正确答案
                const wrongYears = allYears.filter(y => y !== randomItem.year);
                // 生成一些常见的错误年份选项
                const generateWrongYear = (correctYear) => {
                    // 尝试从年份中提取数字
                    const yearMatch = correctYear.match(/\d+/);
                    if (yearMatch) {
                        const baseYear = parseInt(yearMatch[0]);
                        const wrongYearOptions = [
                            (baseYear - 100) + '年',
                            (baseYear + 100) + '年',
                            (baseYear - 200) + '年',
                            (baseYear + 200) + '年'
                        ];
                        return wrongYearOptions.filter(y => y !== correctYear);
                    }
                    return ['约前1000年', '约前500年', '约前2000年', '约前1500年'];
                };
                const availableWrong = [...new Set([...wrongYears, ...generateWrongYear(randomItem.year)])];
                // 随机选择3个错误选项
                const selectedWrong = availableWrong
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3);
                // 合并并打乱，确保去重
                const allOptions = [randomItem.year, ...selectedWrong];
                const uniqueOptions = [...new Set(allOptions)];
                // 如果去重后选项不够4个，补充选项
                while (uniqueOptions.length < 4) {
                    const randomYear = generateWrongYear(randomItem.year)[Math.floor(Math.random() * 3)];
                    if (!uniqueOptions.includes(randomYear) && randomYear !== randomItem.year) {
                        uniqueOptions.push(randomYear);
                    }
                }
                return uniqueOptions.slice(0, 4).sort(() => Math.random() - 0.5);
            },
            explanation: `${randomItem.title}发生在${randomItem.year}，位于${randomItem.city}。${randomItem.description.substring(0, 100)}...`
        }
    ];
    
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    currentQuestion = {
        type: questionType.type,
        question: questionType.question,
        correct: questionType.correct,
        options: questionType.getOptions(),
        explanation: questionType.explanation,
        item: randomItem,
        date: new Date().toDateString()
    };
    
    saveCurrentQuestion();
}

// 保存当前题目
function saveCurrentQuestion() {
    localStorage.setItem('current_question', JSON.stringify(currentQuestion));
}

// 加载当前题目
function loadCurrentQuestion() {
    const stored = localStorage.getItem('current_question');
    if (stored) {
        currentQuestion = JSON.parse(stored);
        const today = new Date().toDateString();
        if (currentQuestion.date !== today) {
            generateDailyQuestion();
        }
    } else {
        generateDailyQuestion();
    }
}

// 显示每日问答
function showDailyQuiz() {
    // 每次打开都生成新题目（不限制每天一道）
    generateDailyQuestion();
    
    if (!currentQuestion) {
        alert('暂无题目，请稍后再试');
        return;
    }
    
    const modal = document.getElementById('quiz-modal');
    if (!modal) return;
    
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    const explanationEl = document.getElementById('quiz-explanation');
    const resultEl = document.getElementById('quiz-result');
    
    questionEl.textContent = currentQuestion.question;
    explanationEl.style.display = 'none';
    resultEl.style.display = 'none';
    
    // 生成选项
    optionsEl.innerHTML = '';
    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option';
        button.textContent = option;
        button.dataset.option = option;
        button.onclick = () => selectAnswer(option);
        optionsEl.appendChild(button);
    });
    
    modal.classList.add('show');
}

// 选择答案
function selectAnswer(selectedOption) {
    const isCorrect = selectedOption === currentQuestion.correct;
    const options = document.querySelectorAll('.quiz-option');
    
    options.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.option === currentQuestion.correct) {
            btn.classList.add('correct');
        } else if (btn.dataset.option === selectedOption && !isCorrect) {
            btn.classList.add('wrong');
        }
    });
    
    // 显示结果
    const resultEl = document.getElementById('quiz-result');
    const explanationEl = document.getElementById('quiz-explanation');
    
    resultEl.style.display = 'block';
    explanationEl.style.display = 'block';
    explanationEl.textContent = currentQuestion.explanation;
    
    if (isCorrect) {
        resultEl.innerHTML = '<span class="quiz-correct">✓ 回答正确！</span>';
        resultEl.className = 'quiz-result correct';
        quizData.totalQuestions++;
        quizData.correctAnswers++;
        
        // 增加积分
        addPoints(5, '答对题目');
    } else {
        resultEl.innerHTML = '<span class="quiz-wrong">✗ 回答错误</span>';
        resultEl.className = 'quiz-result wrong';
        quizData.totalQuestions++;
        
        // 显示正确答案
        resultEl.innerHTML += `<br><span class="correct-answer">正确答案：${currentQuestion.correct}</span>`;
    }
    
    quizData.lastQuizDate = new Date().toDateString();
    saveQuizData();
    updateQuizUI();
    updateGamification();
}

// 更新问答UI
function updateQuizUI() {
    const quizStats = document.getElementById('quiz-stats');
    if (!quizStats) return;
    
    const accuracy = quizData.totalQuestions > 0 
        ? Math.round((quizData.correctAnswers / quizData.totalQuestions) * 100) 
        : 0;
    
    quizStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">正确率</span>
            <span class="stat-value">${accuracy}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">连续天数</span>
            <span class="stat-value">${quizData.consecutiveDays}天</span>
        </div>
    `;
}

// 获取答题统计
function getQuizStats() {
    return {
        totalQuestions: quizData.totalQuestions,
        correctAnswers: quizData.correctAnswers,
        accuracy: quizData.totalQuestions > 0 
            ? Math.round((quizData.correctAnswers / quizData.totalQuestions) * 100) 
            : 0,
        consecutiveDays: quizData.consecutiveDays
    };
}

