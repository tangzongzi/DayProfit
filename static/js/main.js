document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const resultSection = document.getElementById('resultSection');
    const resultTableBody = document.getElementById('resultTableBody');
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    const totalProfit = document.getElementById('totalProfit');
    
    // 摘要卡片元素
    const totalIncomeSummary = document.getElementById('totalIncomeSummary');
    const totalExpenseSummary = document.getElementById('totalExpenseSummary');
    const totalProfitSummary = document.getElementById('totalProfitSummary');
    
    let profitChart = null;
    
    // 获取API端点 - 本地开发或Netlify部署
    const getApiUrl = () => {
        // 检查是否在Netlify环境
        if (window.location.hostname.includes('netlify.app') || 
            window.location.hostname === 'dayprofit.tangzongzi.com') {
            return '/.netlify/functions/process';
        }
        // 本地开发环境
        return '/upload';
    };
    
    // 初始化粘性导航栏效果
    initStickyNavbar();
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 检查文件选择
        if (!fileInput.files || fileInput.files.length === 0) {
            showError('请选择一个文件');
            return;
        }
        
        const file = fileInput.files[0];
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        
        // 验证文件类型
        if (!allowedTypes.includes(file.type) && 
            !file.name.endsWith('.xlsx') && 
            !file.name.endsWith('.xls') && 
            !file.name.endsWith('.csv')) {
            showError('请选择有效的Excel或CSV文件');
            return;
        }
        
        // 隐藏错误和结果，显示加载指示器
        errorMessage.classList.add('d-none');
        resultSection.classList.add('d-none');
        loadingIndicator.classList.remove('d-none');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>处理中...';
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // 发送文件到API
            const apiUrl = getApiUrl();
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // 处理响应
            if (!response.ok) {
                throw new Error(data.error || '上传文件时出错');
            }
            
            if (data.success && data.data) {
                displayResults(data.data);
                // 滚动到结果区域
                setTimeout(() => {
                    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 200);
            } else {
                throw new Error('处理文件时出错');
            }
            
        } catch (error) {
            showError(error.message);
        } finally {
            loadingIndicator.classList.add('d-none');
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="bi bi-bar-chart-line me-2"></i>上传并分析';
        }
    });
    
    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
        // 滚动到错误消息
        errorMessage.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 显示计算结果
    function displayResults(data) {
        if (!data || data.length === 0) {
            showError('没有数据可以显示');
            return;
        }
        
        // 清空表格
        resultTableBody.innerHTML = '';
        
        // 计算总计
        let incomeSum = 0;
        let expenseSum = 0;
        let profitSum = 0;
        
        // 准备图表数据
        const dates = [];
        const profits = [];
        const incomes = [];
        const expenses = [];
        
        // 填充表格
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // 日期
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(row.日期);
            tr.appendChild(dateCell);
            
            // 收入
            const incomeCell = document.createElement('td');
            incomeCell.textContent = formatCurrency(row.收入);
            tr.appendChild(incomeCell);
            
            // 支出
            const expenseCell = document.createElement('td');
            expenseCell.textContent = formatCurrency(row.支出);
            tr.appendChild(expenseCell);
            
            // 利润
            const profitCell = document.createElement('td');
            profitCell.textContent = formatCurrency(row.利润);
            profitCell.classList.add(row.利润 >= 0 ? 'positive-profit' : 'negative-profit');
            tr.appendChild(profitCell);
            
            resultTableBody.appendChild(tr);
            
            // 累加总计
            incomeSum += row.收入;
            expenseSum += row.支出;
            profitSum += row.利润;
            
            // 添加图表数据
            dates.push(formatDate(row.日期));
            profits.push(row.利润);
            incomes.push(row.收入);
            expenses.push(row.支出);
        });
        
        // 设置总计
        totalIncome.textContent = formatCurrency(incomeSum);
        totalExpense.textContent = formatCurrency(expenseSum);
        totalProfit.textContent = formatCurrency(profitSum);
        totalProfit.classList.add(profitSum >= 0 ? 'positive-profit' : 'negative-profit');
        
        // 设置摘要卡片
        if (totalIncomeSummary) totalIncomeSummary.textContent = formatCurrency(incomeSum);
        if (totalExpenseSummary) totalExpenseSummary.textContent = formatCurrency(expenseSum);
        if (totalProfitSummary) {
            totalProfitSummary.textContent = formatCurrency(profitSum);
            totalProfitSummary.classList.add(profitSum >= 0 ? 'positive-profit' : 'negative-profit');
        }
        
        // 创建图表
        createChart(dates, profits, incomes, expenses);
        
        // 显示结果部分
        resultSection.classList.remove('d-none');
    }
    
    // 格式化货币
    function formatCurrency(value) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2
        }).format(value);
    }
    
    // 格式化日期
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', options);
        } catch (e) {
            return dateString; // 如果解析失败，返回原始字符串
        }
    }
    
    // 创建利润图表
    function createChart(dates, profits, incomes, expenses) {
        const ctx = document.getElementById('profitChart').getContext('2d');
        
        // 如果图表已存在，销毁它
        if (profitChart) {
            profitChart.destroy();
        }
        
        // 计算图表的理想高度，确保足够的空间显示
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            // 设置最小高度，但如果数据点超过10个，稍微增加高度
            let height = Math.max(400, dates.length * 20);
            // 限制最大高度
            height = Math.min(height, 600);
            chartContainer.style.height = `${height}px`;
        }
        
        // 创建新图表
        profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: '利润',
                        data: profits,
                        backgroundColor: profits.map(profit => profit >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                        borderColor: profits.map(profit => profit >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'),
                        borderWidth: 1,
                        yAxisID: 'y',
                        borderRadius: 4,
                    },
                    {
                        label: '收入',
                        data: incomes,
                        type: 'line',
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1',
                        tension: 0.1,
                        pointRadius: 4,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                    },
                    {
                        label: '支出',
                        data: expenses,
                        type: 'line',
                        borderColor: 'rgba(245, 158, 11, 0.8)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1',
                        tension: 0.1,
                        pointRadius: 4,
                        pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '每日利润分析图表',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1f2937',
                        bodyColor: '#374151',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        cornerRadius: 6,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += formatCurrency(context.raw);
                                return label;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        align: 'center',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '日期',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '利润 (元)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '收入/支出 (元)',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                hover: {
                    animationDuration: 200
                }
            }
        });
    }
    
    // 初始化粘性导航栏
    function initStickyNavbar() {
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                if (window.scrollY > 50) {
                    navbar.classList.add('navbar-sticky');
                } else {
                    navbar.classList.remove('navbar-sticky');
                }
            }
        });
    }
}); 