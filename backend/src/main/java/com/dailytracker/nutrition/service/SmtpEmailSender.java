package com.dailytracker.nutrition.service;

import com.dailytracker.nutrition.exception.ExternalServiceUnavailableException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Sends the emails by SMTP (Gmail with an app password, see .env.example). HTML emails with the NutriDay logo. */
@Service
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "smtp", matchIfMissing = true)
public class SmtpEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailSender.class);

    private static final String LOGO_CID = "nutridayLogo";
    private static final String LOGO_PATH = "mail/logo.png";
    private static final String BHT_CID = "bhtLogo";
    private static final String BHT_PATH = "mail/bht-logo.png";
    private static final String TEAM_FOOTER = """
            <img src="cid:bhtLogo" width="150" alt="BHT Berlin" style="display:block;margin:0 auto 12px;border:0;">
            Amen allah Hajlaoui, Matrikelnr : 109040<br>
            Bechir Karmeni, Matrikelnr : 113290<br>
            Hochschule Berliner Hochschule f&uuml;r Technik (BHT), Master Medieninformatik<br>
            Lehrveranstaltung Enterprise Web-Development<br>
            Dozent Prof. Dr. Sebastian von Klinski""";

    private final JavaMailSender mailSender;
    private final String from;
    private final String frontendUrl;

    public SmtpEmailSender(JavaMailSender mailSender,
                           @Value("${app.mail.from}") String from,
                           @Value("${app.frontend-url}") String frontendUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void sendVerificationCode(String to, String firstName, String code) {
        // The button opens the app's confirm page with the email and code filled in.
        String link = frontendUrl + "/verify-email?email=" + encode(to) + "&code=" + encode(code);
        sendTemplate(to, "Your NutriDay confirmation code", firstName,
                "You are almost there!",
                "Only one step left. Enter this verification code in the window where you started creating your account, or click the button below.",
                code, "This code is valid for the next 15 minutes.",
                "Confirm my email", link,
                "If you did not create an account, you can ignore this email.");
    }

    @Override
    public void sendSignInCode(String to, String firstName, String code) {
        sendTemplate(to, "Your NutriDay sign-in code", firstName,
                "Your sign-in code",
                "Enter this code in NutriDay to finish signing in with Google.",
                code, "This code is valid for the next 15 minutes.",
                null, null,
                "If you did not try to sign in, you can ignore this email.");
    }

    @Override
    public void sendPasswordResetCode(String to, String firstName, String code) {
        sendTemplate(to, "Your NutriDay password reset code", firstName,
                "Reset your password",
                "Use this code to set a new password for your NutriDay account.",
                code, "This code is valid for the next 15 minutes.",
                null, null,
                "If you did not ask to reset your password, you can ignore this email. Your password stays the same.");
    }

    @Override
    public void sendWelcome(String to, String firstName) {
        try {
            String text = "Hi " + firstName + ",\n\n"
                    + "Your NutriDay account is confirmed. Welcome!\n\n"
                    + "NutriDay helps you eat better every day, without the guesswork. See exactly what you eat, "
                    + "track your progress and reach your goals one meal at a time.\n\n"
                    + "WHAT YOU CAN DO\n"
                    + "- Daily calorie and macro targets calculated from your profile\n"
                    + "- Quick meal logging, with your most eaten foods one tap away\n"
                    + "- Water and weight tracking\n"
                    + "- Recipes with nutrition facts, a shopping list and suggestions from the food in your fridge\n"
                    + "- Progress charts and analytics: your calorie trend and your weekday patterns\n\n"
                    + "WHY NUTRIDAY\n"
                    + "- Built for everyday people, not only athletes\n"
                    + "- Clear numbers, no guesswork\n"
                    + "- English and German\n"
                    + "- Food, water, weight and recipes in one place\n\n"
                    + "YOUR FIRST STEPS\n"
                    + "1. Complete your profile to get your daily targets\n"
                    + "2. Log your first meal\n"
                    + "3. Add a glass of water\n\n"
                    + "Open NutriDay: " + frontendUrl + "\n\nNutriDay";
            send(to, "Welcome to NutriDay", text, welcomeHtml(firstName));
        } catch (ExternalServiceUnavailableException ignored) {
            // Already logged in send(). The welcome email is not needed to finish signing in.
        }
    }

    private String welcomeHtml(String firstName) {
        return "<!doctype html><html><body style=\"margin:0;padding:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f3f6f4;padding:24px 12px;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"560\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;width:100%;background:#ffffff;border-radius:12px;\">"
                + "<tr><td align=\"center\" style=\"padding:28px 24px 4px;\">"
                + "<img src=\"cid:" + LOGO_CID + "\" width=\"56\" height=\"56\" alt=\"NutriDay logo\" style=\"display:block;border:0;\">"
                + "<div style=\"font-size:22px;font-weight:bold;color:#00613f;margin-top:8px;\">NutriDay</div>"
                + "</td></tr>"
                + "<tr><td style=\"padding:12px 40px 8px;\">"
                + "<h1 style=\"font-size:26px;margin:8px 0 14px;color:#111827;text-align:center;\">Welcome to NutriDay!</h1>"
                + "<p style=\"font-size:15px;line-height:1.5;color:#4b5563;margin:0 0 6px;\">Hi " + esc(firstName) + ",</p>"
                + "<p style=\"font-size:15px;line-height:1.5;color:#4b5563;margin:0;\">Your account is confirmed. NutriDay helps you eat better every day, "
                + "without the guesswork. See exactly what you eat, track your progress and reach your goals one meal at a time.</p>"
                + section("What you can do", false,
                        "Daily calorie and macro targets calculated from your profile",
                        "Quick meal logging, with your most eaten foods one tap away",
                        "Water and weight tracking",
                        "Recipes with nutrition facts, a shopping list and suggestions from the food in your fridge",
                        "Progress charts and analytics: your calorie trend and your weekday patterns")
                + section("Why NutriDay", false,
                        "Built for everyday people, not only athletes",
                        "Clear numbers, no guesswork",
                        "English and German",
                        "Food, water, weight and recipes in one place")
                + section("Your first steps", true,
                        "Complete your profile to get your daily targets",
                        "Log your first meal",
                        "Add a glass of water")
                + "<div align=\"center\" style=\"padding:24px 0 8px;\">"
                + "<a href=\"" + esc(frontendUrl) + "\" style=\"display:inline-block;background:#00613f;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px;\">Open NutriDay</a>"
                + "</div>"
                + "</td></tr>"
                + "<tr><td align=\"center\" style=\"background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;font-size:12px;color:#6b7280;line-height:1.7;\">"
                + TEAM_FOOTER
                + "</td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    private static String section(String title, boolean ordered, String... items) {
        String tag = ordered ? "ol" : "ul";
        StringBuilder b = new StringBuilder();
        b.append("<h2 style=\"font-size:18px;color:#00613f;margin:24px 0 8px;\">").append(esc(title)).append("</h2>")
         .append("<").append(tag).append(" style=\"margin:0;padding-left:20px;font-size:15px;line-height:1.7;color:#4b5563;\">");
        for (String item : items) {
            b.append("<li>").append(esc(item)).append("</li>");
        }
        return b.append("</").append(tag).append(">").toString();
    }

    private void sendTemplate(String to, String subject, String firstName, String heading, String intro,
                              String code, String codeNote, String buttonText, String link, String footerNote) {
        String text = "Hi " + firstName + ",\n\n" + intro + "\n\n"
                + (code != null ? "Code: " + code + "\n" + codeNote + "\n\n" : "")
                + (link != null ? buttonText + ": " + link + "\n\n" : "")
                + footerNote + "\n\nNutriDay";
        String html = html(firstName, heading, intro, code, codeNote, buttonText, link, footerNote);
        send(to, subject, text, html);
    }

    private String html(String firstName, String heading, String intro, String code, String codeNote,
                        String buttonText, String link, String footerNote) {
        StringBuilder b = new StringBuilder();
        b.append("<!doctype html><html><body style=\"margin:0;padding:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;\">")
         .append("<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f3f6f4;padding:24px 12px;\"><tr><td align=\"center\">")
         .append("<table role=\"presentation\" width=\"560\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;width:100%;background:#ffffff;border-radius:12px;\">")
         .append("<tr><td align=\"center\" style=\"padding:28px 24px 4px;\">")
         .append("<img src=\"cid:").append(LOGO_CID).append("\" width=\"56\" height=\"56\" alt=\"NutriDay logo\" style=\"display:block;border:0;\">")
         .append("<div style=\"font-size:22px;font-weight:bold;color:#00613f;margin-top:8px;\">NutriDay</div>")
         .append("</td></tr>")
         .append("<tr><td align=\"center\" style=\"padding:12px 40px 8px;\">")
         .append("<h1 style=\"font-size:26px;margin:8px 0 14px;color:#111827;\">").append(esc(heading)).append("</h1>")
         .append("<p style=\"font-size:15px;line-height:1.5;color:#4b5563;margin:0 0 6px;text-align:left;\">Hi ").append(esc(firstName)).append(",</p>")
         .append("<p style=\"font-size:15px;line-height:1.5;color:#4b5563;margin:0 0 20px;text-align:left;\">").append(esc(intro)).append("</p>")
         .append("</td></tr>");
        if (code != null) {
            b.append("<tr><td style=\"padding:0 40px;\">")
             .append("<div style=\"background:#d1f4ea;border-radius:10px;padding:20px 8px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:8px;color:#0f172a;\">")
             .append(esc(code)).append("</div>")
             .append("<p style=\"font-size:12px;color:#6b7280;text-align:center;margin:8px 0 0;\">").append(esc(codeNote)).append("</p>")
             .append("</td></tr>");
        }
        if (buttonText != null && link != null) {
            b.append("<tr><td align=\"center\" style=\"padding:24px 40px 8px;\">")
             .append("<p style=\"font-size:14px;color:#374151;margin:0 0 14px;\">Or click the button below to continue.</p>")
             .append("<a href=\"").append(esc(link)).append("\" style=\"display:inline-block;background:#00613f;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px;\">")
             .append(esc(buttonText)).append("</a>")
             .append("</td></tr>");
        }
        b.append("<tr><td align=\"center\" style=\"padding:24px 40px 20px;\">")
         .append("<p style=\"font-size:13px;color:#6b7280;margin:0;\">").append(esc(footerNote)).append("</p>")
         .append("</td></tr>")
         .append("<tr><td align=\"center\" style=\"background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;font-size:12px;color:#6b7280;line-height:1.7;\">")
         .append(TEAM_FOOTER)
         .append("</td></tr>")
         .append("</table></td></tr></table></body></html>");
        return b.toString();
    }

    private void send(String to, String subject, String text, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, html);
            helper.addInline(LOGO_CID, new ClassPathResource(LOGO_PATH), "image/png");
            helper.addInline(BHT_CID, new ClassPathResource(BHT_PATH), "image/png");
            mailSender.send(message);
            log.info("Email '{}' sent to {}", subject, to);
        } catch (MailException | MessagingException ex) {
            // Codes are never logged in SMTP mode; only the failure is.
            log.error("Could not send the email '{}'", subject, ex);
            throw new ExternalServiceUnavailableException(
                    "We could not send the email. Please try again in a few minutes.");
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String esc(String value) {
        return HtmlUtils.htmlEscape(value);
    }
}
