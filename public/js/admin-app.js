/* admin-app.js — рефакторинг для работы через API вместо localStorage */

let orders = [];
let currentUser = null;
let ordersRefreshInterval = null;

// =========================================================
// Авторизация
// =========================================================

async function handleLogin() {
    const login = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!login || !password) {
        showToast('Введите логин и пароль');
        return;
    }

    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        showToast(data.error || 'Неверный логин или пароль');
        return;
    }

    currentUser = data;
    showAdminPanel();
}

async function checkExistingSession() {
    const res = await fetch('/api/admin/me');
    if (res.ok) {
        currentUser = await res.json();
        showAdminPanel();
    }
    // Если 401 — остаёмся на экране логина, ничего не делаем
}

async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    currentUser = null;
    stopOrdersAutoRefresh();
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginInput').value = '';
    document.getElementById('passwordInput').value = '';
    // Сбрасываем видимость кнопок навигации
    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.style.display = '');
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    filterNavByAccess();
    loadOrders();
    startOrdersAutoRefresh();
}

function filterNavByAccess() {
    if (!currentUser || currentUser.isSuperadmin) return;
    const access = currentUser.access || {};

    document.querySelectorAll('.admin-nav-btn[data-section]').forEach(btn => {
        const section = btn.getAttribute('data-section');
        if (section === 'users') {
            btn.style.display = 'none'; // только суперадмин
        } else if (section && !access[section]) {
            btn.style.display = 'none';
        }
    });
}

// =========================================================
// Заказы
// =========================================================

async function loadOrders() {
    const status = document.getElementById('filterStatus')?.value || '';
    const date = document.getElementById('filterDate')?.value || '';
    const search = document.getElementById('filterSearch')?.value || '';

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (date) params.set('date', date);
    if (search) params.set('search', search);

    const res = await fetch('/api/admin/orders?' + params.toString());
    if (!res.ok) return;

    orders = await res.json();
    renderOrders();
    updateStats();
}

function updateStats() {
    const total = orders.length;
    const newCount = orders.filter(o => o.status === 'new').length;
    const completed = orders.filter(o => o.status === 'completed').length;

    const el = (id) => document.getElementById(id);
    if (el('totalOrders')) el('totalOrders').textContent = total;
    if (el('newOrders')) el('newOrders').textContent = newCount;
    if (el('completedOrders')) el('completedOrders').textContent = completed;
}

function renderOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-orders"><p>Заказов пока нет</p></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-number">${order.number}</span>
                <span class="order-status ${order.status}">${order.status === 'new' ? 'Новый' : 'Выполнен'}</span>
            </div>
            <div class="order-body">
                <div class="order-info">
                    <div class="order-info-item">
                        <label>Клиент</label>
                        <p>${order.name}</p>
                    </div>
                    <div class="order-info-item">
                        <label>Телефон</label>
                        <p>${order.phone}</p>
                    </div>
                    <div class="order-info-item">
                        <label>Дата самовывоза</label>
                        <p>${formatDate(order.pickupDate)}</p>
                    </div>
                    <div class="order-info-item">
                        <label>Время самовывоза</label>
                        <p>${order.pickupTime}</p>
                    </div>
                </div>
                <div class="order-items">
                    <h4>Состав заказа</h4>
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span>${item.name} × ${item.qty}</span>
                            <span>${item.price * item.qty} ₽</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <span class="order-total-label">Итого</span>
                    <span class="order-total-value">${order.total} ₽</span>
                </div>
                ${order.comment ? `<p style="margin-top: 12px; color: var(--gray); font-size: 13px;"><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
                <div class="order-actions">
                    <button class="btn btn-sm ${order.status === 'new' ? 'btn-success' : ''}" onclick="toggleStatus('${order.number}')">
                        ${order.status === 'new' ? '✓ Выполнен' : '↩ Вернуть в новые'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.number}')">Удалить</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleStatus(orderNumber) {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
        method: 'PATCH',
    });
    if (!res.ok) return;
    const updated = await res.json();
    const idx = orders.findIndex(o => o.number === orderNumber);
    if (idx !== -1) orders[idx] = updated;
    renderOrders();
    updateStats();
    showToast(updated.status === 'completed' ? 'Заказ выполнен' : 'Заказ возвращён');
}

async function deleteOrder(orderNumber) {
    if (!confirm('Удалить заказ ' + orderNumber + '?')) return;
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, {
        method: 'DELETE',
    });
    if (!res.ok) return;
    orders = orders.filter(o => o.number !== orderNumber);
    renderOrders();
    updateStats();
    showToast('Заказ удалён');
}

// =========================================================
// Автообновление заказов
// =========================================================

function startOrdersAutoRefresh() {
    stopOrdersAutoRefresh();
    ordersRefreshInterval = setInterval(() => {
        const menuSection = document.getElementById('menuSection');
        const isMenuActive = menuSection && menuSection.classList.contains('active');
        if (!isMenuActive) {
            loadOrders();
        }
    }, 5000);
}

function stopOrdersAutoRefresh() {
    if (ordersRefreshInterval) clearInterval(ordersRefreshInterval);
    ordersRefreshInterval = null;
}

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        startOrdersAutoRefresh();
    } else {
        stopOrdersAutoRefresh();
    }
});

// =========================================================
// Статистика
// =========================================================

let statsPeriodType = 'all';
let statsDateFilter = '';
let statsWeekStart = '';
let statsWeekEnd = '';
let statsMonthFilter = '';

async function renderStats() {
    const params = new URLSearchParams({ type: statsPeriodType });
    if (statsPeriodType === 'date' && statsDateFilter) params.set('date', statsDateFilter);
    if (statsPeriodType === 'week' && statsWeekStart) {
        params.set('from', statsWeekStart);
        if (statsWeekEnd) params.set('to', statsWeekEnd);
    }
    if (statsPeriodType === 'month' && statsMonthFilter) params.set('month', statsMonthFilter);

    const [statsRes, allOrdersRes] = await Promise.all([
        fetch('/api/admin/stats?' + params.toString()),
        fetch('/api/admin/orders'),
    ]);

    const stats = await statsRes.json();
    const allOrders = allOrdersRes.ok ? await allOrdersRes.json() : [];

    const months = [...new Set(allOrders.map(o => o.pickupDate ? o.pickupDate.substring(0, 7) : null).filter(Boolean))].sort().reverse();

    const getBtnStyle = (type) =>
        `padding: 8px 16px; border: 2px solid ${statsPeriodType === type ? 'var(--border)' : '#ddd'}; border-radius: 20px; background: ${statsPeriodType === type ? 'var(--border)' : 'white'}; color: ${statsPeriodType === type ? 'white' : 'var(--dark)'}; cursor: pointer; font-family: 'Oswald', sans-serif; transition: all 0.2s; font-size: 13px;`;

    const formatMonth = (m) => {
        const [year, month] = m.split('-');
        return new Date(year, parseInt(month) - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    };

    let html = `
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <span style="font-family: 'Oswald', sans-serif; font-size: 14px; color: var(--gray); margin-right: 8px;">Период:</span>
                <button type="button" onclick="setStatsPeriod('all')" style="${getBtnStyle('all')}">Все время</button>
                <button type="button" onclick="setStatsPeriod('date')" style="${getBtnStyle('date')}">За дату</button>
                <button type="button" onclick="setStatsPeriod('week')" style="${getBtnStyle('week')}">За неделю</button>
                <button type="button" onclick="setStatsPeriod('month')" style="${getBtnStyle('month')}">За месяц</button>
            </div>

            ${statsPeriodType === 'date' ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <input type="date" value="${statsDateFilter}" onchange="statsDateFilter=this.value; renderStats();" style="padding: 10px 16px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">
                </div>` : ''}

            ${statsPeriodType === 'week' ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="color: var(--gray);">Период с</span>
                    <input type="date" value="${statsWeekStart}" onchange="statsWeekStart=this.value; renderStats();" style="padding: 10px 16px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <span style="color: var(--gray);">по</span>
                    <input type="date" value="${statsWeekEnd}" onchange="statsWeekEnd=this.value; renderStats();" style="padding: 10px 16px; border: 2px solid #ddd; border-radius: 4px; font-size: 14px;">
                </div>` : ''}

            ${statsPeriodType === 'month' ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                    <div style="display: flex; gap: 8px; overflow-x: auto; padding: 4px 0;">
                        ${months.map(m => `
                            <button type="button" onclick="statsMonthFilter='${m}'; renderStats();" style="padding: 8px 16px; border: 2px solid ${statsMonthFilter === m ? 'var(--border)' : '#ddd'}; border-radius: 20px; background: ${statsMonthFilter === m ? 'var(--border)' : 'white'}; color: ${statsMonthFilter === m ? 'white' : 'var(--dark)'}; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 13px; white-space: nowrap;">
                                ${formatMonth(m)}
                            </button>
                        `).join('')}
                    </div>
                </div>` : ''}
        </div>

        <div class="stats" style="margin-bottom: 30px;">
            <div class="stat-card"><h3>Всего заказов</h3><div class="value">${stats.totalOrders}</div></div>
            <div class="stat-card"><h3>Новые</h3><div class="value">${stats.newOrders}</div></div>
            <div class="stat-card"><h3>Выполненные</h3><div class="value">${stats.completedOrders}</div></div>
            <div class="stat-card"><h3>Выручка</h3><div class="value">${stats.totalRevenue} ₽</div></div>
        </div>
    `;

    document.getElementById('statsContent').innerHTML = html;
}

function setStatsPeriod(type) {
    statsPeriodType = type;
    renderStats();
}

// =========================================================
// Контакты
// =========================================================

async function renderContacts() {
    const res = await fetch('/api/admin/contacts');
    if (!res.ok) return;
    const contacts = await res.json();

    let html = `
        <a href="/api/admin/contacts/export" class="btn btn-filled" style="display: inline-block; margin-bottom: 20px;">Скачать Excel</a>

        <div style="background: white; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: var(--light-gray);">
                    <tr>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif; width: 50px;">№</th>
                        <th style="padding: 12px; text-align: left; font-family: 'Oswald', sans-serif;">Имя</th>
                        <th style="padding: 12px; text-align: left; font-family: 'Oswald', sans-serif;">Телефон</th>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif;">Кол-во заказов</th>
                    </tr>
                </thead>
                <tbody>
                    ${contacts.length > 0 ? contacts.map((c, i) => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px; text-align: center; color: var(--gray);">${i + 1}</td>
                            <td style="padding: 12px;">${c.name}</td>
                            <td style="padding: 12px;">${c.phone}</td>
                            <td style="padding: 12px; text-align: center;">${c.ordersCount}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--gray);">Нет контактов</td></tr>'}
                </tbody>
            </table>
        </div>
        <p style="margin-top: 12px; color: var(--gray); font-size: 14px;">Всего уникальных клиентов: ${contacts.length}</p>
    `;

    document.getElementById('contactsContent').innerHTML = html;
}

// =========================================================
// Пользователи
// =========================================================

async function renderUsers() {
    const res = await fetch('/api/admin/users');
    if (!res.ok) {
        document.getElementById('usersContent').innerHTML = '<p style="color: var(--gray);">Нет доступа</p>';
        return;
    }
    const users = await res.json();

    let html = `
        <div style="margin-bottom: 20px; padding: 20px; background: white; border-radius: 8px;">
            <h3 style="font-family: 'Oswald', sans-serif; margin-bottom: 16px;">Добавить пользователя</h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
                <div>
                    <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--gray);">Имя пользователя</label>
                    <input type="text" id="newUserLogin" placeholder="Логин" style="padding: 8px 12px; border: 2px solid #ddd; border-radius: 4px; width: 150px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 4px; font-size: 12px; color: var(--gray);">Пароль</label>
                    <input type="password" id="newUserPassword" placeholder="Пароль" style="padding: 8px 12px; border: 2px solid #ddd; border-radius: 4px; width: 150px;">
                </div>
                <button class="btn btn-filled" onclick="addNewUser()">Добавить</button>
            </div>
        </div>

        <div style="background: white; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: var(--light-gray);">
                    <tr>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif; width: 50px;">№</th>
                        <th style="padding: 12px; text-align: left; font-family: 'Oswald', sans-serif;">Логин</th>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif;">Заказы</th>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif;">Статистика</th>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif;">Контакты</th>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif;">Меню</th>
                        <th style="padding: 12px; text-align: center; font-family: 'Oswald', sans-serif;">Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.length > 0 ? users.map((u, i) => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px; text-align: center; color: var(--gray);">${i + 1}</td>
                            <td style="padding: 12px;">${u.login}</td>
                            <td style="padding: 12px; text-align: center;"><input type="checkbox" ${u.access.orders ? 'checked' : ''} onchange="toggleUserAccess(${u.id}, 'orders', this.checked)"></td>
                            <td style="padding: 12px; text-align: center;"><input type="checkbox" ${u.access.stats ? 'checked' : ''} onchange="toggleUserAccess(${u.id}, 'stats', this.checked)"></td>
                            <td style="padding: 12px; text-align: center;"><input type="checkbox" ${u.access.contacts ? 'checked' : ''} onchange="toggleUserAccess(${u.id}, 'contacts', this.checked)"></td>
                            <td style="padding: 12px; text-align: center;"><input type="checkbox" ${u.access.menu ? 'checked' : ''} onchange="toggleUserAccess(${u.id}, 'menu', this.checked)"></td>
                            <td style="padding: 12px; text-align: center;">
                                <button class="btn btn-sm" style="background: #e74c3c; border-color: #e74c3c; color: white;" onclick="deleteUser(${u.id})">Удалить</button>
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--gray);">Нет пользователей</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('usersContent').innerHTML = html;
}

async function addNewUser() {
    const login = document.getElementById('newUserLogin').value.trim();
    const password = document.getElementById('newUserPassword').value;

    if (!login || !password) {
        showToast('Введите логин и пароль');
        return;
    }

    const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
    });

    const data = await res.json();
    if (!res.ok) {
        showToast(data.error || 'Ошибка');
        return;
    }

    document.getElementById('newUserLogin').value = '';
    document.getElementById('newUserPassword').value = '';
    renderUsers();
    showToast('Пользователь добавлен');
}

async function toggleUserAccess(userId, section, allowed) {
    await fetch(`/api/admin/users/${userId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [section]: allowed }),
    });
}

async function deleteUser(userId) {
    if (!confirm('Удалить этого пользователя?')) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Ошибка');
        return;
    }
    renderUsers();
    showToast('Пользователь удалён');
}

// =========================================================
// Меню
// =========================================================

let currentMenu = [];

async function loadMenuForDate() {
    const date = document.getElementById('menuDate').value;
    if (!date) return;

    const res = await fetch(`/api/admin/menu?date=${date}`);
    if (!res.ok) return;
    currentMenu = await res.json();
    renderMenuItems();
}

async function copyMenuFromDate() {
    const toDate = document.getElementById('menuDate').value;
    const fromDate = document.getElementById('copyFromDate').value;

    if (!toDate) { showToast('Выберите дату назначения'); return; }
    if (!fromDate) { showToast('Выберите дату, откуда копировать'); return; }

    const res = await fetch('/api/admin/menu/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate }),
    });

    const data = await res.json();
    if (!res.ok) {
        showToast(data.error || 'Ошибка копирования');
        return;
    }

    showToast(`Меню скопировано (${data.copied} блюд)`);
    loadMenuForDate();
}

async function addNewItem() {
    const date = document.getElementById('menuDate').value;
    if (!date) { showToast('Выберите дату'); return; }

    const name = document.getElementById('newItemName').value.trim();
    const price = parseInt(document.getElementById('newItemPrice').value);
    const weight = document.getElementById('newItemWeight').value.trim();

    if (!name) { showToast('Введите название'); return; }
    if (isNaN(price) || price <= 0) { showToast('Введите цену'); return; }

    const res = await fetch('/api/admin/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuDate: date, name, price, weight }),
    });

    if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Ошибка');
        return;
    }

    document.getElementById('newItemName').value = '';
    document.getElementById('newItemPrice').value = '';
    document.getElementById('newItemWeight').value = '';
    showToast('Блюдо добавлено');
    loadMenuForDate();
}

async function patchItem(itemId, fields) {
    const res = await fetch(`/api/admin/menu/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
    });
    return res.ok;
}

async function toggleItemAvailability(itemId) {
    const item = currentMenu.find(i => i.id === itemId);
    if (!item) return;
    await patchItem(itemId, { available: !item.available });
    loadMenuForDate();
}

function editItemName(itemId) {
    document.getElementById('nameText_' + itemId).style.display = 'none';
    document.getElementById('nameInput_' + itemId).style.display = 'inline-block';
    document.getElementById('nameSaveBtn_' + itemId).style.display = 'inline-block';
    document.getElementById('nameInput_' + itemId).focus();
}

async function saveItemName(itemId) {
    const newName = document.getElementById('nameInput_' + itemId).value.trim();
    if (!newName) return;
    const ok = await patchItem(itemId, { name: newName });
    if (ok) {
        showToast('Название сохранено');
        loadMenuForDate();
    }
}

function editItemPrice(itemId) {
    document.getElementById('priceText_' + itemId).style.display = 'none';
    document.getElementById('priceInput_' + itemId).style.display = 'inline-block';
    document.getElementById('priceSaveBtn_' + itemId).style.display = 'inline-block';
    document.getElementById('priceInput_' + itemId).focus();
}

async function saveItemPrice(itemId) {
    const newPrice = parseInt(document.getElementById('priceInput_' + itemId).value);
    if (isNaN(newPrice) || newPrice < 0) return;
    const ok = await patchItem(itemId, { price: newPrice });
    if (ok) {
        showToast('Цена сохранена');
        loadMenuForDate();
    }
}

function editItemQuantity(itemId) {
    document.getElementById('quantityText_' + itemId).style.display = 'none';
    document.getElementById('quantityInput_' + itemId).style.display = 'inline-block';
    document.getElementById('quantitySaveBtn_' + itemId).style.display = 'inline-block';
    document.getElementById('quantityEditBtn_' + itemId).style.display = 'none';
    document.getElementById('quantityInput_' + itemId).focus();
}

async function saveItemQuantity(itemId) {
    const newQty = parseInt(document.getElementById('quantityInput_' + itemId).value);
    if (isNaN(newQty) || newQty < 0) return;
    const ok = await patchItem(itemId, { quantity: newQty });
    if (ok) {
        showToast('Количество сохранено');
        loadMenuForDate();
    }
}

async function deleteItem(itemId) {
    if (!confirm('Удалить это блюдо?')) return;
    const res = await fetch(`/api/admin/menu/items/${itemId}`, { method: 'DELETE' });
    if (!res.ok) return;
    showToast('Блюдо удалено');
    loadMenuForDate();
}

function toggleSelectAll() {
    const checked = document.getElementById('selectAllCheckbox').checked;
    document.querySelectorAll('.itemCheckbox').forEach(cb => cb.checked = checked);
    updateDeleteButton();
}

function updateDeleteButton() {
    const count = document.querySelectorAll('.itemCheckbox:checked').length;
    const btn = document.getElementById('deleteSelectedBtn');
    if (btn) {
        btn.style.display = count > 0 ? 'inline-block' : 'none';
        btn.textContent = count > 0 ? `Удалить выбранные (${count})` : 'Удалить выбранные';
    }
}

async function deleteSelectedItems() {
    const checked = document.querySelectorAll('.itemCheckbox:checked');
    if (checked.length === 0) return;
    if (!confirm(`Удалить ${checked.length} блюд?`)) return;

    const ids = Array.from(checked).map(cb => parseInt(cb.value));
    const res = await fetch('/api/admin/menu/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });

    if (!res.ok) return;
    const data = await res.json();
    showToast(`Удалено ${data.deleted} блюд`);
    loadMenuForDate();
}

async function toggleAllItems(available) {
    const date = document.getElementById('menuDate').value;
    if (!date) return;
    await fetch('/api/admin/menu/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, available }),
    });
    showToast(available ? 'Все блюда доступны' : 'Все блюда недоступны');
    loadMenuForDate();
}

async function uploadMenuFromExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    const date = document.getElementById('menuDate').value;

    if (!file) { showToast('Выберите файл'); return; }
    if (!date) { showToast('Выберите дату'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('date', date);

    const res = await fetch('/api/admin/menu/import', {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
        showToast(data.error || 'Ошибка загрузки');
        return;
    }

    showToast(`Загружено ${data.imported} блюд`);
    fileInput.value = '';
    loadMenuForDate();
}

function downloadTemplate() {
    window.location.href = '/api/admin/menu/template';
}

function renderMenuItems() {
    const date = document.getElementById('menuDate').value;
    const container = document.getElementById('menuItemsList');

    if (!date) {
        container.innerHTML = '<p style="color: var(--gray);">Выберите дату для редактирования меню</p>';
        return;
    }

    const menu = currentMenu;
    const availableCount = menu.filter(i => i.available).length;

    const formatDateRu = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
        <div style="margin-bottom: 8px;">
            <h3 style="font-family: 'Oswald', sans-serif; font-size: 22px; color: var(--dark);">Меню на ${formatDateRu(date)}</h3>
        </div>
        <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <p>Доступно блюд: <strong style="color: var(--success);">${availableCount}</strong> из ${menu.length}</p>
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()">
                    <span>Выбрать все</span>
                </label>
                <button class="btn btn-sm" onclick="toggleAllItems(true)">Все доступны</button>
                <button class="btn btn-sm btn-danger" onclick="toggleAllItems(false)">Все недоступны</button>
                <button id="deleteSelectedBtn" class="btn btn-sm" style="background: #e74c3c; border-color: #e74c3c; color: white; display: none;" onclick="deleteSelectedItems()">Удалить выбранные</button>
            </div>
        </div>
        <div class="orders-list">
            ${menu.map(item => `
                <div class="order-card" style="display: flex; ${!item.available ? 'opacity: 0.6;' : ''}">
                    <div style="display: flex; align-items: flex-start; padding: 16px; border-right: 1px solid #eee;">
                        <input type="checkbox" class="itemCheckbox" value="${item.id}" onchange="updateDeleteButton()">
                    </div>
                    <div style="flex: 1;">
                        <div class="order-header">
                            <span id="nameText_${item.id}" class="order-number" style="font-size: 20px; color: #1a1a1a;">${item.name}</span>
                            <input type="text" id="nameInput_${item.id}" value="${item.name}" style="display: none; font-size: 16px; font-family: 'Oswald', sans-serif; padding: 4px 8px; border: 2px solid var(--border); border-radius: 4px; width: 300px;">
                            <button id="nameSaveBtn_${item.id}" class="btn btn-sm btn-filled" style="display: none; margin-left: 8px;" onclick="saveItemName(${item.id})">Сохранить</button>
                            <span style="padding: 6px 16px; border-radius: 20px; font-size: 12px; font-family: 'Oswald', sans-serif; text-transform: uppercase; background: ${item.available ? '#d4edda' : '#fff3cd'}; color: ${item.available ? '#155724' : '#856404'};">
                                ${item.available ? 'Доступно' : 'Нет в наличии'}
                            </span>
                        </div>
                        <div class="order-body">
                            <div class="order-info">
                                <div class="order-info-item">
                                    <label>Цена</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span id="priceText_${item.id}" style="color: var(--highlight); font-family: 'Oswald', sans-serif; font-size: 18px;">${item.price} ₽</span>
                                        <input type="number" id="priceInput_${item.id}" value="${item.price}" style="display: none; width: 80px; padding: 4px 8px; border: 2px solid var(--border); border-radius: 4px; font-family: 'Oswald', sans-serif; font-size: 16px;">
                                        <button id="priceSaveBtn_${item.id}" class="btn btn-sm btn-filled" style="display: none;" onclick="saveItemPrice(${item.id})">Сохранить</button>
                                    </div>
                                </div>
                                <div class="order-info-item">
                                    <label>Количество</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span id="quantityText_${item.id}" style="color: var(--highlight); font-family: 'Oswald', sans-serif; font-size: 18px;">${item.quantity || 50}</span>
                                        <input type="number" id="quantityInput_${item.id}" value="${item.quantity || 50}" style="display: none; width: 80px; padding: 4px 8px; border: 2px solid var(--border); border-radius: 4px; font-family: 'Oswald', sans-serif; font-size: 16px;">
                                        <button id="quantitySaveBtn_${item.id}" class="btn btn-sm btn-filled" style="display: none;" onclick="saveItemQuantity(${item.id})">Сохранить</button>
                                        <button id="quantityEditBtn_${item.id}" class="btn btn-sm" onclick="editItemQuantity(${item.id})">Изменить</button>
                                    </div>
                                </div>
                                <div class="order-info-item">
                                    <label>Вес</label>
                                    <p>${item.weight}</p>
                                </div>
                            </div>
                            <div class="order-actions">
                                <button class="btn btn-sm ${item.available ? 'btn-danger' : 'btn-success'}" onclick="toggleItemAvailability(${item.id})">
                                    ${item.available ? 'Сделать недоступным' : 'Сделать доступным'}
                                </button>
                                <button class="btn btn-sm" onclick="editItemName(${item.id})">Изменить название</button>
                                <button class="btn btn-sm" onclick="editItemPrice(${item.id})">Изменить цену</button>
                                <button class="btn btn-sm" style="background: #e74c3c; border-color: #e74c3c; color: white;" onclick="deleteItem(${item.id})">Удалить</button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// =========================================================
// Навигация по разделам
// =========================================================

function showSection(section) {
    document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.admin-nav-btn[data-section]').forEach(el => el.classList.remove('active'));

    const sectionEl = document.getElementById(section + 'Section');
    if (sectionEl) sectionEl.classList.add('active');

    const navBtn = document.querySelector(`.admin-nav-btn[data-section="${section}"]`);
    if (navBtn) navBtn.classList.add('active');

    if (section === 'menu') {
        const today = new Date();
        today.setDate(today.getDate() + 1);
        // Находим ближайший рабочий день
        while (today.getDay() === 0 || today.getDay() === 6) today.setDate(today.getDate() + 1);
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const menuDateInput = document.getElementById('menuDate');
        if (menuDateInput && !menuDateInput.value) {
            menuDateInput.value = `${yyyy}-${mm}-${dd}`;
        }
        loadMenuForDate();
    }
    if (section === 'stats') renderStats();
    if (section === 'contacts') renderContacts();
    if (section === 'users') renderUsers();
}

// =========================================================
// Утилиты
// =========================================================

function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function closeModal() {
    document.getElementById('modal')?.classList.remove('open');
}

// =========================================================
// Инициализация
// =========================================================

document.addEventListener('DOMContentLoaded', function () {
    checkExistingSession();

    document.getElementById('passwordInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('loginInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleLogin();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });
});
