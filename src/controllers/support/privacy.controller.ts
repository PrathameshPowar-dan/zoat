import { type Response, type Request } from "express";
import prisma from "../../utils/prisma.js";
import { asyncHandler } from "../../utils/AsyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getPrivacyPolicy = asyncHandler(async (req: Request, res: Response) => {
    const SECTIONS = [
        {
            icon: 'account-details-outline',
            title: 'Information We Collect',
            body: 'When you create an account or place an order, we collect your name, phone number, email, delivery address, and order history. When you make a payment, basic payment method details (card / UPI / wallet) are also collected.',
        },
        {
            icon: 'map-marker-outline',
            title: 'Location Data',
            body: 'Your current location is used only to show nearby restaurants, auto-detect your delivery address, and enable live order tracking. You can turn off location access from your device settings at any time, but some features (like live tracking) won’t work without it.',
        },
        {
            icon: 'cog-outline',
            title: 'How We Use Your Information',
            body: 'Your data is used to process orders, assign delivery partners, send order status updates, provide customer support, and show relevant offers and recommendations. We never use your data for anything else without your consent.',
        },
        {
            icon: 'credit-card-outline',
            title: 'Payment Information',
            body: 'All payments are processed through PCI-DSS compliant, secure payment gateway partners. We do not store your card or bank details on our servers — we only receive an encrypted token from the gateway.',
        },
        {
            icon: 'account-group-outline',
            title: 'Sharing With Third Parties',
            body: 'Information needed to fulfil your order (name, address, order details) is shared with the restaurant partner and delivery partner. Limited data is also shared with payment gateways and analytics providers — we never sell your data to any marketing company.',
        },
        {
            icon: 'cookie-outline',
            title: 'Cookies & Tracking',
            body: 'We use cookies and similar tracking technologies to improve app experience, track crash reports, and understand usage patterns. These can be managed from your device settings.',
        },
        {
            icon: 'camera-outline', // NEW SECTION
            title: 'Camera & Photo Library Access',
            body: 'We may request access to your camera or photo library if you choose to upload a profile picture or share images with our support team regarding an order issue. Images are strictly used for these purposes only.',
        },
        {
            icon: 'database-clock-outline', // NEW SECTION
            title: 'Data Retention',
            body: 'We retain your personal information as long as your account is active or as needed to provide you services. We may also retain and use your information to comply with legal obligations and resolve disputes.',
        },
        {
            icon: 'shield-check-outline',
            title: 'Data Security',
            body: 'Your data is stored using industry-standard encryption on secure servers. We regularly review our security practices, but no online system is 100% risk-free — please never share your password with anyone.',
        },
        {
            icon: 'account-key-outline',
            title: 'Your Rights',
            body: 'You can view or edit your profile data, opt out of marketing notifications, or request account deletion at any time — from Profile > Settings, or by contacting our support team.',
        },
        {
            icon: 'human-child',
            title: "Children's Privacy",
            body: 'This app is not intended for children under the age of 18, and we do not knowingly collect data from them. If such data is found, it is deleted immediately.',
        },
        {
            icon: 'file-document-edit-outline',
            title: 'Changes to This Policy',
            body: 'This policy may be updated from time to time. For any major change, we will notify you via an app notification or email. The "Last updated" date at the top will always reflect the latest version.',
        },
    ];

    return res.status(200).json(
        new ApiResponse(200, SECTIONS, 'Privacy policy fetched successfully')
    );
});