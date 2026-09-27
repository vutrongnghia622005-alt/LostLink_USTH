(function () {
    'use strict';

    const API_URL = window.LOSTLINK_API_URL || 'http://localhost:3000';
    const TOKEN_KEY = 'lostlink_token';
    const USER_KEY = 'lostlink_user';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    function getStoredUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        } catch (error) {
            return null;
        }
    }

    function saveSession(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    async function request(path, options = {}) {
        const headers = {
            ...(options.headers || {})
        };

        const token = getToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const requestOptions = {
            method: options.method || 'GET',
            headers
        };

        if (options.body !== undefined) {
            if (options.body instanceof FormData) {
                requestOptions.body = options.body;
            } else {
                headers['Content-Type'] = 'application/json';
                requestOptions.body = JSON.stringify(options.body);
            }
        }

        const response = await fetch(`${API_URL}${path}`, requestOptions);

        let data = null;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            const message = data?.message || `Request failed with status ${response.status}.`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    function escapeHTML(value = '') {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function formatDateTime(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Chưa xác định';
        }

        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function formatRelativeTime(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Vừa đăng';
        }

        const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
        if (seconds < 60) return 'Vừa đăng';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ngày trước`;

        return new Intl.DateTimeFormat('vi-VN').format(date);
    }

    function showMessage(message, target = document.activeElement) {
        const container = target?.closest?.('.field, label, form, .manage-card, .feedback-card, .claim-card, .admin-panel, .admin-card, .detail-actions') || document.querySelector('main') || document.body;
        let box = [...container.children].find((element) => element.classList.contains('inline-message'));
        if (!box) {
            box = document.createElement('p');
            box.className = 'inline-message';
            box.setAttribute('role', 'alert');
            container.appendChild(box);
        }
        box.textContent = message;
        return box;
    }

    function renderPagination(root, data, onPage) {
        root.replaceChildren();
        root.hidden = data.totalPages <= 1;
        if (root.hidden) return;
        const add = (label, page, disabled = false) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `page-btn${page === data.page ? ' active' : ''}`;
            button.textContent = label;
            button.disabled = disabled;
            if (page === data.page) button.setAttribute('aria-current', 'page');
            button.addEventListener('click', () => onPage(page));
            root.appendChild(button);
        };
        add('‹ Trước', data.page - 1, data.page === 1);
        const start = Math.max(1, Math.min(data.page - 2, data.totalPages - 4));
        for (let page = start; page <= Math.min(data.totalPages, start + 4); page += 1) add(String(page), page);
        add('Sau ›', data.page + 1, data.page === data.totalPages);
    }

    function debounce(callback, delay = 250) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); };
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((input) => {
            if (input.labels?.length || input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')) return;
            const names = {
                completeSearchQuery: 'Từ khóa tìm kiếm', completeSearchCategory: 'Danh mục',
                completeSearchLocation: 'Địa điểm', completeSearchStatus: 'Loại tin',
                completeSearchSort: 'Sắp xếp', pageSearch: 'Từ khóa tìm kiếm', sortOrder: 'Sắp xếp',
                adminPostSearch: 'Tìm bài đăng', adminPostType: 'Loại tin', adminPostStatus: 'Trạng thái'
            };
            input.setAttribute('aria-label', names[input.id] || input.placeholder || input.options?.[0]?.text || input.name || 'Ô nhập');
        });
        const phone = document.getElementById('postPhone');
        const validatePhone = () => {
            if (!phone) return;
            const valid = /^[0-9 +\-]+$/.test(phone.value) && /^[0-9]{8,15}$/.test(phone.value.replace(/[^0-9]/g, ''));
            phone.setCustomValidity(valid ? '' : 'Số điện thoại phải có 8–15 chữ số; chỉ dùng chữ số, dấu cách, + và -.');
        };
        phone?.addEventListener('input', validatePhone);
        document.addEventListener('invalid', (event) => {
            event.preventDefault();
            const input = event.target;
            input.setAttribute('aria-invalid', 'true');
            const box = showMessage(input.validationMessage, input);
            if (input.id) {
                box.id = `${input.id}-error`;
                input.setAttribute('aria-describedby', box.id);
            }
        }, true);
        const clearFieldError = (event) => {
            const input = event.target;
            if (!input.matches('input, textarea, select')) return;
            if (input.validity.valid) {
                input.removeAttribute('aria-invalid');
                const box = document.getElementById(`${input.id}-error`);
                if (box) box.textContent = '';
            }
        };
        document.addEventListener('input', clearFieldError);
        document.addEventListener('change', clearFieldError);
        document.querySelectorAll('form').forEach((form) => { form.noValidate = true; });
        document.addEventListener('submit', (event) => {
            validatePhone();
            if (event.target.checkValidity()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            event.target.querySelector(':invalid')?.focus();
        }, true);
    });

    window.LostLink = {
        showMessage,
        renderPagination,
        debounce,
        API_URL,
        request,
        getToken,
        getStoredUser,
        saveSession,
        clearSession,
        escapeHTML,
        formatDateTime,
        formatRelativeTime
    };
})();
