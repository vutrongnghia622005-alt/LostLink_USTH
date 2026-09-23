(function () {
    'use strict';

    if (!window.LostLink) return;

    const {
        request,
        escapeHTML,
        formatDateTime
    } = window.LostLink;

    function claimStatusInfo(status) {
        const map = {
            pending: ['Đang chờ xác minh', 'pending', 'Admin đang kiểm tra thông tin.'],
            approved: ['Đã duyệt', 'verified', 'Hồ sơ đã được xác minh. Hãy dùng mã nhận đồ tại bàn trực.'],
            rejected: ['Bị từ chối', 'rejected', 'Thông tin hiện tại chưa đủ để xác minh quyền sở hữu.'],
            completed: ['Đã bàn giao', 'completed', 'Tài sản đã được ghi nhận bàn giao thành công.']
        };

        return map[status] || ['Đang xử lý', 'pending', 'Hồ sơ đang được xử lý.'];
    }

    function buildClaimAnswers(post) {
        const questions = Array.isArray(post.verification_questions)
            ? post.verification_questions
            : [];

        return questions.map((question, index) => {
            const input = document.getElementById(`claimAnswer${index}`);

            return {
                question: question.question,
                answer: input?.value.trim() || ''
            };
        });
    }

    function openClaimModal(post) {
        let modal = document.getElementById('apiClaimModal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'apiClaimModal';
            modal.className = 'portal-modal';
            modal.hidden = true;
            document.body.appendChild(modal);
        }

        const questions = Array.isArray(post.verification_questions)
            ? post.verification_questions
            : [];

        const questionFields = questions.map((question, index) => `
            <label class="full">
                <span>${escapeHTML(question.question)} ${question.required ? '*' : ''}</span>
                <input
                    class="form-control"
                    id="claimAnswer${index}"
                    ${question.required ? 'required' : ''}
                    maxlength="250"
                >
            </label>
        `).join('');

        modal.innerHTML = `
            <div class="portal-modal-backdrop" data-claim-close></div>
            <section class="portal-dialog portal-dialog-wide" role="dialog" aria-modal="true">
                <button class="portal-dialog-close" type="button" data-claim-close>
                    <i data-lucide="x"></i>
                </button>
                <div class="portal-dialog-head">
                    <span class="portal-dialog-icon"><i data-lucide="shield-check"></i></span>
                    <div>
                        <span class="portal-kicker">XÁC MINH QUYỀN SỞ HỮU</span>
                        <h2>Yêu cầu nhận lại đồ</h2>
                        <p>${escapeHTML(post.title)}</p>
                    </div>
                </div>
                <form id="apiClaimForm" class="portal-form-grid">
                    <label>
                        <span>Mã sinh viên *</span>
                        <input class="form-control" id="claimStudentId" required maxlength="40">
                    </label>
                    <label>
                        <span>Email / Số điện thoại *</span>
                        <input class="form-control" id="claimContact" required maxlength="180">
                    </label>
                    ${questionFields}
                    <label class="full">
                        <span>Mô tả thêm để chứng minh quyền sở hữu *</span>
                        <textarea class="form-textarea" id="claimMessage" required minlength="10" maxlength="800"></textarea>
                    </label>
                    <div class="portal-security-note full">
                        <i data-lucide="lock-keyhole"></i>
                        <span>Thông tin xác minh chỉ được gửi tới backend và Admin.</span>
                    </div>
                    <div class="portal-dialog-actions full">
                        <button class="btn btn-secondary" type="button" data-claim-close>Hủy</button>
                        <button class="btn btn-primary" type="submit">
                            <i data-lucide="send"></i>Gửi yêu cầu
                        </button>
                    </div>
                </form>
                <div id="apiClaimSuccess" class="portal-success-state" hidden></div>
            </section>
        `;

        modal.querySelectorAll('[data-claim-close]').forEach((element) => {
            element.addEventListener('click', () => {
                modal.hidden = true;
            });
        });

        modal.querySelector('#apiClaimForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            const form = event.currentTarget;
            if (!form.reportValidity()) return;

            try {
                const claim = await request('/api/claims', {
                    method: 'POST',
                    body: {
                        postId: post.id,
                        studentId: document.getElementById('claimStudentId').value.trim(),
                        contact: document.getElementById('claimContact').value.trim(),
                        message: document.getElementById('claimMessage').value.trim(),
                        answers: buildClaimAnswers(post)
                    }
                });

                form.hidden = true;

                const success = document.getElementById('apiClaimSuccess');
                sessionStorage.setItem('lostlink_recent_claim_code', claim.tracking_code);
                success.hidden = false;
                success.innerHTML = `
                    <span class="portal-success-icon"><i data-lucide="circle-check-big"></i></span>
                    <h3>Đã gửi hồ sơ xác minh</h3>
                    <p>Mã theo dõi yêu cầu:</p>
                    <div class="portal-code-box">${escapeHTML(claim.tracking_code)}</div>
                    <div class="portal-dialog-actions">
                        <a class="btn btn-primary" href="claim-status.html">
                            Theo dõi trạng thái
                        </a>
                    </div>
                `;

                window.lucide?.createIcons();
            } catch (error) {
                alert(error.message);
            }
        });

        modal.hidden = false;
        window.lucide?.createIcons();
    }

    function setupClaimButton() {
        const detailActions = document.querySelector('.detail-actions');
        if (!detailActions) return;

        window.addEventListener('lostlink:detail-loaded', (event) => {
            const post = event.detail;

            if (!post || post.type !== 'found' || post.status !== 'active') return;
            if (document.getElementById('secureClaimBtn')) return;

            const button = document.createElement('button');
            button.id = 'secureClaimBtn';
            button.className = 'btn btn-secure-claim';
            button.type = 'button';
            button.innerHTML = '<i data-lucide="shield-check"></i>Yêu cầu nhận lại đồ';
            button.addEventListener('click', () => openClaimModal(post));

            detailActions.prepend(button);
            window.lucide?.createIcons();
        });
    }

    async function renderMyClaims() {
        const list = document.getElementById('claimsTrackingList');
        if (!list) return;

        list.innerHTML = `
            <div class="portal-empty-state">
                <i data-lucide="scan-search"></i>
                <h3>Không cần đăng nhập</h3>
                <p>Sau khi gửi yêu cầu nhận đồ, hãy dùng mã CLM-… để theo dõi trạng thái.</p>
                <a class="btn btn-primary" href="claim-status.html">Tra cứu mã yêu cầu</a>
            </div>
        `;

        window.lucide?.createIcons();
    }

    async function renderClaimLookup(code) {
        const result = document.getElementById('claimLookupResult');
        if (!result) return;

        const normalized = String(code || '').trim().toUpperCase();

        if (!normalized) {
            result.innerHTML = `
                <div class="portal-empty-state">
                    <i data-lucide="scan-search"></i>
                    <h3>Nhập mã yêu cầu</h3>
                    <p>Mã có dạng CLM-….</p>
                </div>
            `;
            window.lucide?.createIcons();
            return;
        }

        try {
            const claim = await request(`/api/claims/track/${encodeURIComponent(normalized)}`);
            const [label, cssClass, note] = claimStatusInfo(claim.status);

            result.innerHTML = `
                <article class="claim-result-card">
                    <div class="claim-result-top">
                        <div>
                            <span class="portal-kicker">HỒ SƠ ${escapeHTML(claim.tracking_code)}</span>
                            <h2>${escapeHTML(claim.post_title)}</h2>
                        </div>
                        <span class="claim-status ${cssClass}">${escapeHTML(label)}</span>
                    </div>
                    <div class="claim-result-grid">
                        <div><span>Gửi lúc</span><strong>${escapeHTML(formatDateTime(claim.created_at))}</strong></div>
                        <div><span>Cập nhật</span><strong>${escapeHTML(formatDateTime(claim.updated_at))}</strong></div>
                    </div>
                    <div class="claim-status-note">
                        <i data-lucide="info"></i><span>${escapeHTML(note)}</span>
                    </div>
                    ${claim.pickup_code ? `<div class="verification-token"><span>MÃ NHẬN ĐỒ</span><strong>${escapeHTML(claim.pickup_code)}</strong><small>Xuất trình mã này tại bàn trực.</small></div>` : ''}
                    ${claim.admin_note ? `<div class="portal-admin-note"><strong>Ghi chú từ Admin</strong><p>${escapeHTML(claim.admin_note)}</p></div>` : ''}
                </article>
            `;
        } catch (error) {
            result.innerHTML = `
                <div class="portal-empty-state is-error">
                    <i data-lucide="circle-x"></i>
                    <h3>Không tìm thấy hồ sơ</h3>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;
        }

        window.lucide?.createIcons();
    }

    function setupClaimLookup() {
        const form = document.getElementById('claimLookupForm');
        const input = document.getElementById('claimLookupCode');

        if (!form || !input) return;

        const legacyCode = new URLSearchParams(location.search).get('code');
        if (legacyCode) history.replaceState(null, '', location.pathname);
        const code = legacyCode || sessionStorage.getItem('lostlink_recent_claim_code') || '';
        if (code) {
            input.value = code.toUpperCase();
            renderClaimLookup(code);
        } else {
            renderClaimLookup('');
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            renderClaimLookup(input.value);
        });
    }

    async function renderStatusOverview() {
        const root = document.getElementById('portalStatusOverview');
        if (!root) return;

        try {
            const [lost, found] = await Promise.all([
                request('/api/posts?type=lost&status=active'),
                request('/api/posts?type=found&status=active')
            ]);

            const values = {
                portalLostCount: lost.length,
                portalFoundCount: found.length
            };

            Object.entries(values).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });

            // Guest reports and claims are tracked with their private codes, not an account.
        } catch (error) {
            // Overview is helpful but should not break the rest of the page.
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupClaimButton();
        renderMyClaims();
        setupClaimLookup();
        renderStatusOverview();
        window.lucide?.createIcons();
    });
})();
