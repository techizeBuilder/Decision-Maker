# Naeberly Platform - Full-Stack Business Networking Application

## Overview
Naeberly is a business networking platform designed to connect sales representatives with decision-makers for scheduled calls and meetings. It aims to streamline professional networking by facilitating invitations, call scheduling, feedback management, and rating systems. The platform includes robust user management, a credit system for enterprise accounts, and administrative tools tailored for various user roles. The vision is to enhance networking efficiency and provide a structured environment for professional interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern full-stack architecture.

### Frontend
- **Framework**: React with Vite
- **UI Components**: Radix UI and shadcn/ui
- **Styling**: Tailwind CSS with Naeberly custom design tokens
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with Express session management
- **Session Storage**: MongoDB-backed session store
- **API Design**: RESTful API with role-based access control

### Key Features & Implementations
- **User Management**: Multi-role support (Sales Reps, Decision Makers, Enterprise Admins, Super Admins) with JWT authentication, role-based access control, and LinkedIn/domain verification.
- **Call Scheduling & Management**: Integration with Google Calendar API for scheduling, time zone management, call status tracking, and post-call feedback/rating. Includes monthly call limits for both DMs and sales reps. **UPDATED September 2025**: Implemented comprehensive three-condition availability checking system (DM database conflicts, DM Google Calendar conflicts, Sales Rep database conflicts). Extended working hours to 8 AM - 6 PM UTC to capture all potential conflicts. Join Call timing changed from 10 minutes to 2 minutes before scheduled time with enhanced time display format. **CRITICAL FIX COMPLETED September 2025**: Resolved date range boundary issues using Date.UTC() method, ensuring proper conflict detection and preventing double bookings. System now successfully blocks conflicting time slots in real-time.
- **Credit System**: Enterprise credit allocation, usage tracking per representative, configurable limits, and automatic monthly renewal. Credits are awarded ONLY when invited decision makers onboard AND connect their calendar. DM credit eligibility is based on engagement scores, with monthly caps per rep. Sales reps cannot access database if invited DMs don't connect calendar. **UPDATED August 2025**: Credit allocation changed from 5 to 1 call per connected DM. Database access now requires both accepted invitations AND connected DM calendars. Fixed duplicate DM display issue with proper deduplication logic. Calendar disconnection flagging system automatically flags sales reps when invited DMs disconnect calendars.
- **Administrative Tools**: Super Admin panel for platform oversight, Enterprise Admin dashboard for company-level management, comprehensive flagging system with real-time data and content moderation, and analytics dashboard.
- **Onboarding Flows**: Streamlined 2-step registration for decision makers (personal info + nominations), automatic allocation of 3 calls per month, and progressive information collection for sales reps with dynamic package selection.
- **Email Service**: Integration for invitations, booking confirmations, call reminders, and post-call feedback emails with professional HTML templates. Includes automated background job for sending post-call feedback emails and email addon payment system with automatic activation.
- **Activity Logging**: Comprehensive logging for all super admin actions, including user management, credit management, communication, subscription management, and platform settings.
- **Platform Settings**: Database-persistent configuration for user limits, credit systems, enterprise features, security, and compliance, managed via the super admin panel.
- **Flag Management System**: Real-time flag reporting with MongoDB integration, dynamic filtering by status/type/date, comprehensive review and action capabilities, and proper authentication for status updates.
- **Payment Integration**: Stripe integration for email addon purchases with automatic `hasEmailAddon` status updates and payment verification.
- **UI/UX Decisions**: Consistent global light theme, dynamic subscription plan displays with enhanced UI, comprehensive badge system for Decision Makers (e.g., Verified, Calendar), and fixed navigation bar positioning with consistent page spacing.

## External Dependencies

### Third-party Services
- **MongoDB Atlas**: Cloud database hosting.
- **Google Calendar API**: Calendar integration and scheduling.
- **LinkedIn API**: Profile verification (configured).
- **Mailtrap SMTP**: Email service for invitations and notifications.
- **Stripe API**: Payment integration for user registration flows.

### Key NPM Packages
- **Authentication**: `bcrypt`, `jsonwebtoken`, `express-session`
- **Database**: `mongoose`, `connect-mongo`
- **UI Components**: `@radix-ui/react-*`, `@tanstack/react-query`
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **Development**: `vite`, `typescript`, `tailwindcss`