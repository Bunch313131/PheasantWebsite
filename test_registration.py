"""
Pheasant Invitational — Registration Flow Tests
Runs against a local HTTP server.
"""

import sys
from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://localhost:8080'
REG_URL = f'{BASE_URL}/register.html'

# Override JS dates so both registration windows are open
OVERRIDE_DATES_SCRIPT = """
    // Force both registration windows to appear open
    const _realDate = Date;
    class MockDate extends _realDate {
        constructor(...args) {
            if (args.length === 0) {
                super('2026-07-01T18:00:00Z'); // Past both open dates
            } else {
                super(...args);
            }
        }
        static now() { return new _realDate('2026-07-01T18:00:00Z').getTime(); }
    }
    window.Date = MockDate;
"""

PASS = '\u2705'
FAIL = '\u274c'

results = []

def check(label, condition, detail=''):
    status = PASS if condition else FAIL
    msg = f'  {status}  {label}'
    if detail:
        msg += f' — {detail}'
    print(msg)
    results.append((label, condition))
    return condition


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ── TEST 1: Date gate (registration not yet open) ──────────────────────
        print('\n[1] Date Gate — Registration Not Yet Open')
        page = browser.new_page()
        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        status_div = page.locator('#regPageStatus')
        form_div = page.locator('#regPageForm')
        check('Status card visible', status_div.is_visible())
        check('Form area hidden', not form_div.is_visible())
        check('"Registration Is Not Yet Open" heading shown',
              'Registration Is Not Yet Open' in page.inner_text('#regPageStatus'))
        check('Sponsor date shown', 'June 5, 2026' in page.inner_text('#regPageStatus'))
        check('Open date shown', 'June 12, 2026' in page.inner_text('#regPageStatus'))
        page.close()

        # ── TEST 2: Form appears when dates are overridden ──────────────────────
        print('\n[2] Form Visibility — Dates Overridden (Both Windows Open)')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)
        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        check('Status card hidden', not page.locator('#regPageStatus').is_visible())
        check('Form area visible', page.locator('#regPageForm').is_visible())
        check('Sponsor tab visible', page.locator('#tabSponsor').is_visible())
        check('Open tab visible', page.locator('#tabOpen').is_visible())
        check('Sponsor tab active by default',
              'active' in (page.locator('#tabSponsor').get_attribute('class') or ''))
        check('Sponsor fields visible', page.locator('#sponsorFields').is_visible())
        page.close()

        # ── TEST 3: Tab switching (Sponsor → Open) ──────────────────────────────
        print('\n[3] Tab Switching — Sponsor to Open')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)
        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        page.locator('#tabOpen').click()
        check('Open tab becomes active',
              'active' in (page.locator('#tabOpen').get_attribute('class') or ''))
        check('Sponsor tab no longer active',
              'active' not in (page.locator('#tabSponsor').get_attribute('class') or ''))
        check('Sponsor fields hidden', not page.locator('#sponsorFields').is_visible())
        submit_text = page.locator('#submitText').inner_text()
        check('Submit button text updates to "Submit Registration"',
              submit_text.lower().strip() == 'submit registration')
        page.close()

        # ── TEST 4: Sponsor membership warning ─────────────────────────────────
        print('\n[4] Sponsor Tab — Non-eligible Membership Warning')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)
        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        # Sponsor tab is already active
        page.locator('#membershipLevel').select_option('single_golfer')
        warning = page.locator('#membershipWarning')
        check('Warning shown for non-eligible membership', warning.is_visible())

        page.locator('#membershipLevel').select_option('proprietary_emeritus')
        check('Warning hidden for eligible membership', not warning.is_visible())
        page.close()

        # ── TEST 5: Sponsor form — client-side validation ───────────────────────
        print('\n[5] Sponsor Form — Client-Side Validation')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)

        # Intercept dialog (alert) to capture messages without blocking
        alerts = []
        page.on('dialog', lambda d: (alerts.append(d.message), d.accept()))

        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        # Try submitting with wrong membership (should alert)
        page.locator('#membershipLevel').select_option('young_professional')
        page.locator('[name="depositAck"]').check()
        page.locator('#memberEmail').fill('test@example.com')
        page.locator('#memberName').fill('Test Member')
        page.locator('#memberGhin').fill('1234567')
        page.locator('#guestName').fill('Test Guest')
        page.locator('#guestGhin').fill('7654321')
        page.locator('#submitBtn').click()

        check('Alert fired for wrong membership on sponsor form', len(alerts) > 0)
        check('Correct alert text about membership',
              any('Proprietary' in a or 'Emeritus' in a for a in alerts))
        check('Form not submitted (still visible)', page.locator('#registrationForm').is_visible())
        page.close()

        # ── TEST 6: Sponsor form — missing sponsor name ──────────────────────────
        print('\n[6] Sponsor Form — Missing Sponsor Name')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)

        alerts2 = []
        page.on('dialog', lambda d: (alerts2.append(d.message), d.accept()))

        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        # Eligible membership but no sponsor name
        page.locator('#membershipLevel').select_option('proprietary_emeritus')
        page.locator('#memberEmail').fill('test@example.com')
        page.locator('#memberName').fill('Test Member')
        page.locator('#memberGhin').fill('1234567')
        page.locator('#guestName').fill('Test Guest')
        page.locator('#guestGhin').fill('7654321')
        page.locator('[name="depositAck"]').check()
        # sponsorName left blank
        page.locator('#submitBtn').click()

        check('Alert fired for missing sponsor name', len(alerts2) > 0)
        check('Correct alert text about sponsor name',
              any('Sponsor' in a or 'sponsor' in a for a in alerts2))
        page.close()

        # ── TEST 7: Full sponsor submission (mocked fetch) ──────────────────────
        print('\n[7] Full Sponsor Submission — Success Flow')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)

        # Intercept the Google Apps Script fetch to avoid real network calls
        page.route('**/macros/s/**', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body='{"status":"success","message":"Registration submitted successfully."}'
        ))

        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        page.locator('#membershipLevel').select_option('proprietary_emeritus')
        page.locator('#sponsorName').fill('Acme Corp')
        page.locator('#memberEmail').fill('member@example.com')
        page.locator('#memberName').fill('John Doe')
        page.locator('#memberGhin').fill('1234567')
        page.locator('#guestName').fill('Jane Smith')
        page.locator('#guestGhin').fill('7654321')
        page.locator('#guestEmail').fill('guest@example.com')
        page.locator('#guestClub').fill('Riviera CC')
        page.locator('[name="par3Contest"]').check()
        page.locator('[name="depositAck"]').check()
        page.locator('#submitBtn').click()
        page.wait_for_timeout(1500)

        check('Success panel shown', page.locator('#formSuccess').is_visible())
        check('Form hidden after success', not page.locator('#registrationForm').is_visible())
        check('Success message mentions sponsor',
              'sponsor' in page.locator('#successMessage').inner_text().lower())
        check('Return to site button present',
              page.locator('#formSuccess a').is_visible())
        page.close()

        # ── TEST 8: Full open registration submission ────────────────────────────
        print('\n[8] Full Open Registration Submission — Success Flow')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)

        page.route('**/macros/s/**', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body='{"status":"success","message":"Registration submitted successfully."}'
        ))

        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        page.locator('#tabOpen').click()
        page.locator('#membershipLevel').select_option('single_golfer')
        page.locator('#memberEmail').fill('member@example.com')
        page.locator('#memberName').fill('John Doe')
        page.locator('#memberGhin').fill('1234567')
        page.locator('#guestName').fill('Jane Smith')
        page.locator('#guestGhin').fill('7654321')
        page.locator('[name="depositAck"]').check()
        page.locator('#submitBtn').click()
        page.wait_for_timeout(1500)

        check('Success panel shown', page.locator('#formSuccess').is_visible())
        check('Form hidden after success', not page.locator('#registrationForm').is_visible())
        success_text = page.locator('#successMessage').inner_text()
        check('Success message mentions registration process',
              'logged' in success_text.lower())
        page.close()

        # ── TEST 9: Retry button after error ────────────────────────────────────
        print('\n[9] Error State & Retry Button')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)

        # Simulate network failure
        page.route('**/macros/s/**', lambda route: route.abort('failed'))

        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        page.locator('#tabOpen').click()
        page.locator('#membershipLevel').select_option('single_golfer')
        page.locator('#memberEmail').fill('member@example.com')
        page.locator('#memberName').fill('John Doe')
        page.locator('#memberGhin').fill('1234567')
        page.locator('#guestName').fill('Jane Smith')
        page.locator('#guestGhin').fill('7654321')
        page.locator('[name="depositAck"]').check()
        page.locator('#submitBtn').click()
        page.wait_for_timeout(1500)

        check('Error panel shown', page.locator('#formError').is_visible())
        page.locator('#retryBtn').click()
        check('Form shown again after retry', page.locator('#registrationForm').is_visible())
        check('Error panel hidden after retry', not page.locator('#formError').is_visible())
        page.close()

        # ── TEST 10: Logo upload validation ─────────────────────────────────────
        print('\n[10] Logo Upload — File Type & Preview')
        page = browser.new_page()
        page.add_init_script(OVERRIDE_DATES_SCRIPT)

        alerts3 = []
        page.on('dialog', lambda d: (alerts3.append(d.message), d.accept()))

        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        # Upload a valid PNG (create a 1x1 minimal PNG in memory via JS)
        page.evaluate("""
            // Create a tiny valid PNG as a File and trigger change event
            const canvas = document.createElement('canvas');
            canvas.width = 1; canvas.height = 1;
            canvas.toBlob(blob => {
                const file = new File([blob], 'test-logo.png', { type: 'image/png' });
                const dt = new DataTransfer();
                dt.items.add(file);
                const input = document.getElementById('sponsorLogo');
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }, 'image/png');
        """)
        page.wait_for_timeout(500)

        check('Logo filename updates', page.locator('#logoFileName').inner_text() == 'test-logo.png')
        check('Logo preview appears', page.locator('#logoPreview').is_visible())

        # Remove the logo
        page.locator('#logoRemoveBtn').click()
        check('Logo preview hidden after remove', not page.locator('#logoPreview').is_visible())
        check('Filename resets to "No file chosen"',
              page.locator('#logoFileName').inner_text() == 'No file chosen')
        page.close()

        # ── TEST 11: HTML structure / nav links ──────────────────────────────────
        print('\n[11] Navigation & Page Structure')
        page = browser.new_page()
        page.goto(REG_URL)
        page.wait_for_load_state('networkidle')

        check('Navbar present', page.locator('#navbar').is_visible())
        check('Page title correct', 'Pheasant' in page.title())
        check('Hero section present', page.locator('.reg-hero').is_visible())
        check('Footer present', page.locator('.footer').is_visible())
        check('"View Registration Details" link present',
              page.locator('#regPageStatus a').is_visible())
        page.close()

        browser.close()

        # ── Summary ──────────────────────────────────────────────────────────────
        passed = sum(1 for _, ok in results if ok)
        failed = sum(1 for _, ok in results if not ok)
        total = len(results)
        print(f'\n{"="*50}')
        print(f'  Results: {passed}/{total} passed', end='')
        if failed:
            print(f'  ({failed} FAILED)')
            print('\nFailed tests:')
            for label, ok in results:
                if not ok:
                    print(f'  {FAIL}  {label}')
        else:
            print()
        print('='*50)

        return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(run_tests())
