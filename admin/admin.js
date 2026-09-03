// Shared Admin JavaScript Functions
const AdminAuth = {
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (!response.ok) {
                window.location.href = '/admin/login.html';
                return null;
            }

            const data = await response.json();
            return data.admin;
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = '/admin/login.html';
            return null;
        }
    },

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/admin/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/admin/login.html';
        }
    }
};

const AdminUI = {
    showAlert(message, type = 'info') {
        const alertBox = document.getElementById('alertBox');
        if (!alertBox) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span>${message}</span>
        `;

        alertBox.innerHTML = '';
        alertBox.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    confirmDelete(message = 'Bạn có chắc chắn muốn xóa?') {
        return confirm(message);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    },

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN');
    },

    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('vi-VN');
    },

    getStatusBadge(status, type = 'order') {
        const statusMap = {
            order: {
                'new': { class: 'badge-warning', text: 'Mới' },
                'confirmed': { class: 'badge-info', text: 'Đã xác nhận' },
                'preparing': { class: 'badge-info', text: 'Đang chuẩn bị' },
                'delivering': { class: 'badge-info', text: 'Đang giao' },
                'completed': { class: 'badge-success', text: 'Hoàn thành' },
                'cancelled': { class: 'badge-danger', text: 'Đã hủy' }
            },
            reservation: {
                'pending': { class: 'badge-warning', text: 'Chờ xác nhận' },
                'confirmed': { class: 'badge-success', text: 'Đã xác nhận' },
                'completed': { class: 'badge-secondary', text: 'Hoàn thành' },
                'cancelled': { class: 'badge-danger', text: 'Đã hủy' }
            },
            available: {
                '1': { class: 'badge-success', text: '🟢 Đang bán' },
                '0': { class: 'badge-danger', text: '🔴 Tạm hết' }
            }
        };

        const statusInfo = statusMap[type][status];
        if (!statusInfo) return `<span class="badge badge-secondary">${status}</span>`;

        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }
};

// Mobile menu toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Set active nav item
function setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
}

// Initialize current user display
async function initializeUserDisplay() {
    const admin = await AdminAuth.checkAuth();
    if (admin) {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');

        if (userNameEl) userNameEl.textContent = admin.name;
        if (userRoleEl) userRoleEl.textContent = admin.role === 'SUPER_ADMIN' ? 'Quản trị viên cấp cao' : 'Quản trị viên';
        if (userAvatarEl) userAvatarEl.textContent = admin.name.charAt(0).toUpperCase();

        return admin;
    }
    return null;
}
