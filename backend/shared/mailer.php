<?php
/**
 * shared/mailer.php — the single place CareLink sends email from.
 *
 * Transport: SMTP (Gmail by default) via PHPMailer. Credentials come from
 * carelink_cfg() so they live in backend/config.local.php (gitignored) or real
 * env vars — never in code.
 *
 * Gmail setup (5 minutes):
 *   1. Google Account → Security → turn ON 2-Step Verification (required).
 *   2. Google Account → Security → App passwords → generate one for "Mail".
 *   3. Put the 16-character password in config.local.php as MAIL_PASSWORD.
 *      It is NOT your normal Gmail password.
 *
 * Every function returns bool and never throws into the request — a mail outage
 * must not take down signup. Failures are logged for the developer instead.
 */

require_once __DIR__ . '/../load_config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as MailException;

/** True when SMTP credentials are configured. Lets callers degrade gracefully. */
function carelink_mail_configured(): bool
{
    return carelink_cfg('MAIL_USERNAME', '') !== '' && carelink_cfg('MAIL_PASSWORD', '') !== '';
}

/**
 * Send one HTML email.
 *
 * @return bool true when SMTP accepted the message.
 */
function carelink_send_mail(string $toEmail, string $toName, string $subject, string $htmlBody, string $textBody = ''): bool
{
    if (!carelink_mail_configured()) {
        error_log('CareLink mail: MAIL_USERNAME/MAIL_PASSWORD not configured — email not sent to ' . $toEmail);
        return false;
    }

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = carelink_cfg('MAIL_HOST', 'smtp.gmail.com');
        $mail->SMTPAuth   = true;
        $mail->Username   = carelink_cfg('MAIL_USERNAME', '');
        $mail->Password   = carelink_cfg('MAIL_PASSWORD', '');
        $mail->Port       = (int) carelink_cfg('MAIL_PORT', 587);

        // 587 = STARTTLS, 465 = implicit TLS. Pick from the port so a host swap
        // (Gmail → Hostinger) only needs config changes, not code changes.
        $mail->SMTPSecure = ((int) $mail->Port === 465)
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;

        $mail->Timeout    = 15;
        $mail->CharSet    = 'UTF-8';

        $from     = carelink_cfg('MAIL_FROM', carelink_cfg('MAIL_USERNAME', ''));
        $fromName = carelink_cfg('MAIL_FROM_NAME', 'CareLink');
        $mail->setFrom($from, $fromName);
        $mail->addAddress($toEmail, $toName !== '' ? $toName : $toEmail);
        $mail->addReplyTo($from, $fromName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $textBody !== '' ? $textBody : trim(strip_tags(str_replace(['<br>', '<br/>', '</p>'], "\n", $htmlBody)));

        $mail->send();
        return true;
    } catch (MailException $e) {
        error_log('CareLink mail FAILED to ' . $toEmail . ': ' . $mail->ErrorInfo);
        return false;
    } catch (\Throwable $e) {
        error_log('CareLink mail ERROR to ' . $toEmail . ': ' . $e->getMessage());
        return false;
    }
}

/** Wraps content in the CareLink brand shell. Table-based: email clients ignore flexbox. */
function carelink_mail_template(string $heading, string $intro, string $code, string $note): string
{
    $safeHeading = htmlspecialchars($heading, ENT_QUOTES, 'UTF-8');
    $safeIntro   = htmlspecialchars($intro, ENT_QUOTES, 'UTF-8');
    $safeCode    = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    $safeNote    = htmlspecialchars($note, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#FAE8D0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAE8D0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:18px;overflow:hidden;">
        <tr>
          <td style="background:#2A1608;padding:26px 30px;">
            <span style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Care</span><span style="font-size:22px;font-weight:700;color:#E86019;letter-spacing:-0.3px;">Link</span>
            <div style="font-size:12.5px;color:rgba(255,255,255,0.62);margin-top:3px;">Trusted household help, verified by PESO</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 30px 8px;">
            <h1 style="margin:0 0 10px;font-size:21px;color:#2A1608;">{$safeHeading}</h1>
            <p style="margin:0 0 24px;font-size:14.5px;line-height:22px;color:#7A5A3A;">{$safeIntro}</p>
            <div style="background:#FDF5E8;border:1px solid #EFDCC0;border-radius:14px;padding:20px;text-align:center;">
              <div style="font-size:32px;font-weight:700;letter-spacing:9px;color:#2A1608;">{$safeCode}</div>
            </div>
            <p style="margin:22px 0 0;font-size:13px;line-height:20px;color:#9A7B5A;">{$safeNote}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 30px 30px;">
            <hr style="border:none;border-top:1px solid #F0E2CE;margin:0 0 16px;">
            <p style="margin:0;font-size:11.5px;line-height:18px;color:#B0906C;">
              You received this because someone used this address on CareLink. If it wasn't you, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}

/** Signup confirmation code. */
function carelink_send_verification_code(string $email, string $name, string $code): bool
{
    $html = carelink_mail_template(
        'Confirm your email',
        'Welcome to CareLink! Enter this code in the app to finish setting up your account.',
        $code,
        'This code expires in 15 minutes.'
    );
    return carelink_send_mail($email, $name, 'Your CareLink verification code: ' . $code, $html);
}

/** Password reset code. */
function carelink_send_password_reset_code(string $email, string $name, string $code): bool
{
    $html = carelink_mail_template(
        'Reset your password',
        'We received a request to reset your CareLink password. Enter this code in the app to choose a new one.',
        $code,
        'This code expires in 15 minutes. If you did not request a password reset, ignore this email — your password will not change.'
    );
    return carelink_send_mail($email, $name, 'Your CareLink password reset code: ' . $code, $html);
}
