// 地图相关功能
let mapChart = null;
let currentProvince = null;

// 防抖和节流函数
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

// 防抖的地图更新函数
const debouncedUpdateMap = debounce(function(highlightProvince, periodData, currentPeriod) {
    updateMapInternal(highlightProvince, periodData, currentPeriod);
}, 100);

// 朝代版图定义（基于历史地理学权威资料，使用现代省份名称）
// 参考：《中国历史地图集》、谭其骧《中国历史地理》等权威资料
const dynastyTerritories = {
    '夏商周': {
        // 夏商周时期：主要在中原地区，黄河流域核心区域
        // 夏朝：河南中西部、山西南部
        // 商朝：扩展到河南、山东、河北南部、山西南部、陕西东部、安徽北部
        // 周朝：进一步扩展到湖北北部、江苏北部
        provinces: ['河南', '山西', '陕西', '山东', '河北', '安徽', '湖北'],
        description: '夏商周时期主要控制黄河流域核心区域，以中原为中心'
    },
    '秦汉': {
        // 秦汉统一后：版图大幅扩展
        // 秦朝：统一六国，扩展到长江流域、岭南、西南
        // 汉朝：进一步扩展到新疆（西域都护府）、朝鲜半岛北部、越南北部
        provinces: ['陕西', '河南', '山西', '山东', '河北', '安徽', '湖北', '江苏', '浙江', '四川', '甘肃', '宁夏', '内蒙古', '辽宁', '湖南', '江西', '广东', '广西', '云南', '贵州', '福建', '重庆', '新疆'],
        description: '秦汉统一中国，版图大幅扩展，设立西域都护府'
    },
    '魏晋南北朝': {
        // 魏晋南北朝：虽然分裂，但版图基本保持汉朝范围
        // 部分时期失去对新疆的直接控制，但名义上仍属中国
        provinces: ['河南', '山西', '陕西', '山东', '河北', '安徽', '湖北', '江苏', '浙江', '四川', '甘肃', '宁夏', '内蒙古', '辽宁', '湖南', '江西', '广东', '广西', '云南', '贵州', '福建', '重庆'],
        description: '魏晋南北朝时期，版图基本保持，但分裂为多个政权，对边疆控制减弱'
    },
    '隋唐': {
        // 隋唐盛世：版图达到历史高峰
        // 唐朝：重新控制新疆，设立安西都护府、北庭都护府
        // 对西藏（吐蕃）有影响但未直接统治，对东北、蒙古有控制
        provinces: ['陕西', '河南', '山西', '山东', '河北', '安徽', '湖北', '江苏', '浙江', '四川', '甘肃', '宁夏', '内蒙古', '辽宁', '湖南', '江西', '广东', '广西', '云南', '贵州', '福建', '重庆', '新疆', '青海', '吉林', '黑龙江'],
        description: '隋唐盛世，版图达到历史高峰，重新控制西域，设立安西、北庭都护府'
    },
    '宋元': {
        // 宋朝：版图较小，失去对北方、西北的控制
        // 元朝：版图空前辽阔，包括整个中国及蒙古、中亚部分地区
        // 这里取元朝最大版图
        provinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾'],
        description: '宋元时期：宋朝版图较小，元朝版图空前辽阔，包括整个中国及周边地区'
    },
    '明清': {
        // 明清时期：版图基本接近现代中国疆域
        // 明朝：失去对新疆的直接控制，但对西藏有影响
        // 清朝：重新统一，版图达到历史最大，包括新疆、西藏、蒙古、台湾
        provinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾', '香港', '澳门'],
        description: '明清时期：明朝版图基本保持，清朝版图达到历史最大，包括新疆、西藏、台湾'
    },
    '近代': {
        // 近代（1840-1949）：版图基本保持清朝范围，但部分地区被列强侵占
        // 1840-1895年：台湾属于中国（清朝）
        // 1895年：甲午战争后，《马关条约》将台湾割让给日本
        // 1895-1945年：台湾被日本殖民统治（50年）
        // 1945年：日本战败，台湾回归中国
        // 1945-1949年：台湾属于中华民国
        // 从整个近代时期来看，台湾在1840-1895年和1945-1949年属于中国
        // 虽然中间有50年被日本占领，但从历史连续性看，台湾始终是中国领土的一部分
        provinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾', '香港', '澳门'],
        description: '近代中国版图（1840-1949）：1840-1895年台湾属于中国，1895-1945年被日本占领，1945年回归中国。香港、澳门被割让，但主体版图保持'
    },
    '现代': {
        // 现代：中华人民共和国版图，包括34个省级行政区
        provinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾', '香港', '澳门'],
        description: '现代中国版图，包括34个省级行政区'
    }
};

// 内部地图更新函数
function updateMapInternal(highlightProvince = null, periodData = null, currentPeriod = null) {
    if (!mapChart) return;

    // 获取当前朝代的版图省份
    let dynastyProvinces = [];
    if (currentPeriod && dynastyTerritories[currentPeriod]) {
        dynastyProvinces = dynastyTerritories[currentPeriod].provinces;
    }

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.seriesType === 'scatter') {
                    return params.data.name + '<br/>' + params.data.value;
                }
                if (currentPeriod && dynastyTerritories[currentPeriod]) {
                    return params.name + '<br/>' + dynastyTerritories[currentPeriod].description;
                }
                return params.name;
            }
        },
        geo: {
            map: 'china',
            roam: true,
            zoom: 1.2,
            itemStyle: {
                // 默认样式：如果没有选择朝代，使用默认颜色
                areaColor: currentPeriod ? '#d0d0d0' : {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                        { offset: 0, color: '#fef0f0' },
                        { offset: 1, color: '#ffe0e0' }
                    ]
                },
                borderColor: '#999',
                borderWidth: 1,
                opacity: currentPeriod ? 0.3 : 1
            },
            emphasis: {
                itemStyle: {
                    areaColor: '#FFD700'
                },
                label: {
                    show: true,
                    fontSize: 14,
                    color: '#000'
                }
            },
            label: {
                show: !currentPeriod, // 如果有朝代，默认不显示标签（会在regions中单独设置）
                fontSize: 14,
                color: '#000'
            }
        },
        series: []
    };

    // 如果有选择的朝代，设置版图显示
    if (currentPeriod && dynastyProvinces.length > 0) {
        const provinceNameMap = {
            '北京': ['北京市', '北京'],
            '天津': ['天津市', '天津'],
            '上海': ['上海市', '上海'],
            '重庆': ['重庆市', '重庆'],
            '河北': ['河北省', '河北'],
            '山西': ['山西省', '山西'],
            '辽宁': ['辽宁省', '辽宁'],
            '吉林': ['吉林省', '吉林'],
            '黑龙江': ['黑龙江省', '黑龙江'],
            '江苏': ['江苏省', '江苏'],
            '浙江': ['浙江省', '浙江'],
            '安徽': ['安徽省', '安徽'],
            '福建': ['福建省', '福建'],
            '江西': ['江西省', '江西'],
            '山东': ['山东省', '山东'],
            '河南': ['河南省', '河南'],
            '湖北': ['湖北省', '湖北'],
            '湖南': ['湖南省', '湖南'],
            '广东': ['广东省', '广东'],
            '海南': ['海南省', '海南'],
            '四川': ['四川省', '四川'],
            '贵州': ['贵州省', '贵州'],
            '云南': ['云南省', '云南'],
            '陕西': ['陕西省', '陕西'],
            '甘肃': ['甘肃省', '甘肃'],
            '青海': ['青海省', '青海'],
            '台湾': ['台湾省', '台湾'],
            '内蒙古': ['内蒙古自治区', '内蒙古'],
            '广西': ['广西壮族自治区', '广西'],
            '西藏': ['西藏自治区', '西藏'],
            '宁夏': ['宁夏回族自治区', '宁夏'],
            '新疆': ['新疆维吾尔自治区', '新疆'],
            '香港': ['香港特别行政区', '香港'],
            '澳门': ['澳门特别行政区', '澳门']
        };

        // 设置所有省份的样式
        const allProvinces = Object.keys(provinceNameMap);
        const regionsList = [];
        
        allProvinces.forEach(province => {
            const isInTerritory = dynastyProvinces.includes(province);
            const possibleNames = provinceNameMap[province] || [province + '省', province];
            
            // 为每个可能的名称创建region配置
            possibleNames.forEach(name => {
                regionsList.push({
                    name: name,
                    itemStyle: {
                        areaColor: isInTerritory ? '#FFD700' : '#d0d0d0', // 版图内金色，版图外灰色
                        borderColor: isInTerritory ? '#C8102E' : '#999',
                        borderWidth: isInTerritory ? 2 : 1,
                        opacity: isInTerritory ? 1 : 0.3 // 版图外半透明
                    },
                    label: {
                        show: isInTerritory, // 只显示版图内的标签
                        fontSize: 14,
                        color: isInTerritory ? '#000' : '#666'
                    },
                    emphasis: {
                        itemStyle: {
                            areaColor: isInTerritory ? '#FFA500' : '#b0b0b0',
                            borderColor: isInTerritory ? '#C8102E' : '#999',
                            borderWidth: isInTerritory ? 3 : 1
                        },
                        label: {
                            show: true,
                            fontSize: 14,
                            color: isInTerritory ? '#000' : '#666'
                        }
                    }
                });
            });
        });
        
        option.geo.regions = regionsList;
    }

    // 如果没有选择朝代，但有高亮省份，设置高亮样式
    // 注意：如果已经有朝代版图设置，不要覆盖
    if (!currentPeriod && highlightProvince && !option.geo.regions) {
        option.geo.regions = [{
            name: highlightProvince,
            itemStyle: {
                areaColor: '#FFD700'
            }
        }];
    }

    // 如果有时期数据，添加散点图标记和高亮省份
    if (periodData && periodData.length > 0) {
        // 获取所有有历史事件的省份（从periodData中提取）
        const provincesWithEvents = [];
        const cityProvinceMap = {};
        
        // 如果historyData可用，建立城市到省份的映射
        if (typeof historyData !== 'undefined' && historyData && historyData.length > 0) {
            historyData.forEach(city => {
                cityProvinceMap[city.city] = city.province;
            });
        }
        
        // 从periodData中提取省份信息
        periodData.forEach(d => {
            if (d.province) {
                // 直接从periodData中获取省份
                provincesWithEvents.push(d.province);
            } else if (d.item && d.item.province) {
                provincesWithEvents.push(d.item.province);
            } else if (cityProvinceMap[d.name]) {
                provincesWithEvents.push(cityProvinceMap[d.name]);
            }
        });
        
        // 去重并标准化省份名称
        const uniqueProvinces = [...new Set(provincesWithEvents)];
        
        // 如果有朝代版图，不再单独高亮有历史事件的省份（因为版图已经显示了）
        // 如果没有朝代版图，才高亮显示有历史事件的省份
        if (uniqueProvinces.length > 0 && !currentPeriod) {
            // 省份名称映射（地图可能返回带后缀的名称）
            const provinceNameMap = {
                '北京': ['北京市', '北京'],
                '天津': ['天津市', '天津'],
                '上海': ['上海市', '上海'],
                '重庆': ['重庆市', '重庆'],
                '河北': ['河北省', '河北'],
                '山西': ['山西省', '山西'],
                '辽宁': ['辽宁省', '辽宁'],
                '吉林': ['吉林省', '吉林'],
                '黑龙江': ['黑龙江省', '黑龙江'],
                '江苏': ['江苏省', '江苏'],
                '浙江': ['浙江省', '浙江'],
                '安徽': ['安徽省', '安徽'],
                '福建': ['福建省', '福建'],
                '江西': ['江西省', '江西'],
                '山东': ['山东省', '山东'],
                '河南': ['河南省', '河南'],
                '湖北': ['湖北省', '湖北'],
                '湖南': ['湖南省', '湖南'],
                '广东': ['广东省', '广东'],
                '海南': ['海南省', '海南'],
                '四川': ['四川省', '四川'],
                '贵州': ['贵州省', '贵州'],
                '云南': ['云南省', '云南'],
                '陕西': ['陕西省', '陕西'],
                '甘肃': ['甘肃省', '甘肃'],
                '青海': ['青海省', '青海'],
                '台湾': ['台湾省', '台湾'],
                '内蒙古': ['内蒙古自治区', '内蒙古'],
                '广西': ['广西壮族自治区', '广西'],
                '西藏': ['西藏自治区', '西藏'],
                '宁夏': ['宁夏回族自治区', '宁夏'],
                '新疆': ['新疆维吾尔自治区', '新疆'],
                '香港': ['香港特别行政区', '香港'],
                '澳门': ['澳门特别行政区', '澳门']
            };
            
            const regionsToHighlight = [];
            uniqueProvinces.forEach(province => {
                // 添加可能的省份名称变体
                const possibleNames = provinceNameMap[province] || [province + '省', province];
                possibleNames.forEach(name => {
                    regionsToHighlight.push({
                        name: name,
                        itemStyle: {
                            areaColor: '#FFD700',
                            borderColor: '#C8102E',
                            borderWidth: 2,
                            shadowBlur: 10,
                            shadowColor: 'rgba(255, 215, 0, 0.5)'
                        },
                        emphasis: {
                            itemStyle: {
                                areaColor: '#FFA500',
                                borderColor: '#C8102E',
                                borderWidth: 3,
                                shadowBlur: 15,
                                shadowColor: 'rgba(255, 165, 0, 0.6)'
                            }
                        }
                    });
                });
            });
            
            if (regionsToHighlight.length > 0) {
                // 如果没有朝代版图设置，才添加高亮
                if (!option.geo.regions || option.geo.regions.length === 0) {
                    option.geo.regions = regionsToHighlight;
                }
            }
        }
        
        // 添加散点图标记（更大更明显）
        option.series.push({
            name: '历史地点',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: periodData,
            symbolSize: 20,
            itemStyle: {
                color: '#FFD700',
                shadowBlur: 15,
                shadowColor: 'rgba(255, 215, 0, 0.8)',
                borderColor: '#C8102E',
                borderWidth: 2
            },
            label: {
                show: true,
                position: 'right',
                formatter: '{b}',
                fontSize: 14,
                fontWeight: 'bold',
                color: '#2C3E50',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: [4, 8],
                borderRadius: 4
            },
            emphasis: {
                scale: true,
                itemStyle: {
                    color: '#FFA500',
                    shadowBlur: 20,
                    symbolSize: 25
                }
            }
        });
    }

    // 使用requestAnimationFrame优化渲染
    requestAnimationFrame(() => {
        mapChart.setOption(option, true);
    });
}

// 更新地图配置
function updateMap(highlightProvince = null, periodData = null, currentPeriod = null) {
    if (!mapChart) return;
    // 使用防抖处理
    debouncedUpdateMap(highlightProvince, periodData, currentPeriod);
}

// 地图点击事件
function bindMapEvents() {
    if (!mapChart) return;
    
    mapChart.off('click'); // 移除旧的事件监听器
    mapChart.on('click', function(params) {
        if (params.componentType === 'geo') {
            const provinceName = params.name;
            currentProvince = provinceName;
            
            // 触发自定义事件，通知main.js更新信息面板
            const event = new CustomEvent('provinceClick', {
                detail: { province: provinceName }
            });
            document.dispatchEvent(event);

            // 地图缩放到该省份
            mapChart.dispatchAction({
                type: 'geoRoam',
                componentType: 'geo',
                zoom: 2,
                name: provinceName
            });
        } else if (params.seriesType === 'scatter') {
            // 点击散点图标记
            const cityName = params.data.name;
            
            const event = new CustomEvent('cityClick', {
                detail: { city: cityName }
            });
            document.dispatchEvent(event);
        }
    });
}

// 初始化地图
function initMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        return;
    }
    
    mapChart = echarts.init(mapContainer);
    
    // 检查ECharts是否加载成功
    if (!echarts) {
        return;
    }

    // 加载中国地图数据
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(chinaJson => {
            if (!chinaJson || !chinaJson.features) {
                throw new Error('地图数据格式错误');
            }
            echarts.registerMap('china', chinaJson);
            // 确保地图数据注册后再渲染
            setTimeout(() => {
                updateMapInternal();
                bindMapEvents();
            }, 100);
        })
        .catch(error => {
            // 显示错误提示
            mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;padding:20px;text-align:center;"><p>地图加载失败</p><p style="font-size:12px;margin-top:10px;">请检查网络连接或刷新页面重试</p></div>';
        });

    // 监听窗口大小变化（使用节流优化）
    const throttledResize = throttle(() => {
        if (mapChart) {
            mapChart.resize();
        }
    }, 200);
    
    window.addEventListener('resize', throttledResize);
}

// 高亮省份
function highlightProvince(provinceName) {
    currentProvince = provinceName;
    updateMap(provinceName, null);
}

// 显示时期数据
function showPeriodData(periodData, currentPeriod = null) {
    updateMap(currentProvince, periodData, currentPeriod);
}

// 清除所有标记
function clearMarkers() {
    updateMap(currentProvince, null);
}

// 定位到城市
function locateCity(coordinates) {
    if (!mapChart) return;
    
    mapChart.dispatchAction({
        type: 'geoRoam',
        componentType: 'geo',
        zoom: 3,
        center: coordinates
    });
}
