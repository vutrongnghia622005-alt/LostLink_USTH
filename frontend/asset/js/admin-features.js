(function () {
    'use strict';

    if (!window.LostLink) return;

    const {
        request,
        escapeHTML,
        formatDateTime
    } = window.LostLink;

    let claims = [];

    function claimStatusLabel(status) {
        const labels = {
            pending: 'Chờ xác minh',
            approved: 'Đã duyệt',
            rejected: 'Từ chối',
            completed: 'Đã bàn giao'
        };

        return labels[status] || status;
    }

    function renderClaimAnswers(claim) {
        const questions = Array.isArray(claim.verification_questions)
            ? claim.verification_questions
            : [];
        const answers = Array.isArray(claim.answers)
            ? claim.answers
            : [];

        if (questions.length === 0 && answers.length === 0) {
            return '<p>Không có câu hỏi xác minh riêng.</p>';
        }

        return answers.map((item, index) => {
            const question = questions[index] || {};
            const hint = question.hint
                ? `<small>Gợi ý nội bộ: ${escapeHTML(question.hint)}</small>`
                : '';

            return `
                <div class="claim-answer-row">
                    <strong>${escapeHTML(item.question || question.question || `Câu ${index + 1}`)}</strong>
                    <span>${escapeHTML(item.answer || '—')}</span>
                    ${hint}
                </div>
            `;
        }).join('');
    }

    function renderClaims() {
        const list = document.getElementById('adminClaimsList');
        if (!list) return;

        const search = (document.getElementById('adminClaimSearch')?.value || '').trim().toLowerCase();
        const status = (document.getElementById('adminClaimStatus')?.value || 'ALL').toLowerCase();

        let items = [...claims];

        if (search) {
            items = items.filter((claim) => {
                const text = `${claim.tracking_code} ${claim.post_title} ${claim.claimer_name} ${claim.student_id}`.toLowerCase();
                return text.includes(search);
            });
        }

        if (status !== 'all') {
            items = items.filter((claim) => claim.status === status);
        }

        list.innerHTML = items.length > 0
            ? items.map((claim) => `
                <article class="admin-feature-card">
                    <div class="admin-feature-card-head">
                        <div>
                            <span class="management-code">${escapeHTML(claim.tracking_code)}</span>
                            <h3>${escapeHTML(claim.post_title)}</h3>
                            <p>${escapeHTML(claim.claimer_name)} · ${escapeHTML(claim.student_id)} · ${escapeHTML(claim.contact)}</p>
                        </div>
                        <span class="admin-badge">${escapeHTML(claimStatusLabel(claim.status))}</span>
                    </div>
                    <div class="admin-feature-detail">
                        <p><strong>Bằng chứng sở hữu:</strong> ${escapeHTML(claim.message)}</p>
                        ${renderClaimAnswers(claim)}
                    </div>
                    ${claim.status === 'approved' && claim.pickup_code ? `<div class="verification-token"><span>MÃ NHẬN ĐỒ</span><strong>${escapeHTML(claim.pickup_code)}</strong></div>` : ''}
                    <label class="admin-reply-box">
                        <span>Ghi chú Admin</span>
                        <textarea data-claim-note="${claim.id}">${escapeHTML(claim.admin_note || '')}</textarea>
                    </label>
                    <div class="admin-actions">
                        ${claim.status === 'pending' ? `<button class="admin-btn primary" data-claim-status="approved" data-claim-id="${claim.id}">Duyệt</button>` : ''}
                        ${['pending', 'approved'].includes(claim.status) ? `<button class="admin-btn warning" data-claim-status="rejected" data-claim-id="${claim.id}">Từ chối</button>` : ''}
                        ${claim.status === 'approved' ? `<button class="admin-btn" data-claim-status="completed" data-claim-id="${claim.id}">Đã bàn giao</button>` : ''}
                    </div>
                    <small>Tạo lúc ${escapeHTML(formatDateTime(claim.created_at))}</small>
                </article>
            `).join('')
            : '<div class="empty-admin"><h3>Không có hồ sơ phù hợp</h3></div>';

        bindClaimActions();
    }

    async function loadClaims() {
        if (!document.getElementById('adminClaimsList')) return;

        try {
            claims = await request('/api/claims');
            renderClaims();
        } catch (error) {
            console.error(error);
        }
    }

    function bindClaimActions() {
        document.querySelectorAll('[data-claim-status]').forEach((button) => {
            button.addEventListener('click', async () => {
                const id = button.dataset.claimId;
                const status = button.dataset.claimStatus;
                const adminNote = document.querySelector(`[data-claim-note="${id}"]`)?.value.trim() || '';

                try {
                    await request(`/api/claims/${id}/status`, {
                        method: 'PUT',
                        body: { status, adminNote }
                    });
                    loadClaims();
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    }

    function setupClaimFilters() {
        document.getElementById('adminClaimSearch')?.addEventListener('input', renderClaims);
        document.getElementById('adminClaimStatus')?.addEventListener('change', renderClaims);
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupClaimFilters();
        loadClaims();
        window.lucide?.createIcons();
    });
})();
