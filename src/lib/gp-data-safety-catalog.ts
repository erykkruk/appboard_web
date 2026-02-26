/**
 * Google Play Data Safety Catalog
 * Complete list of categories, data types, and purposes
 * matching the Data Safety section in Google Play Console.
 */

import type { PrivacyCategory, PrivacyDataType, PrivacyPurpose } from "./privacy-catalog";

export const GP_DATA_SAFETY_CATEGORIES: PrivacyCategory[] = [
  {
    category: "location",
    label: "Location",
    types: [
      {
        id: "Approximate location",
        label: "Approximate location",
        description: "User or device physical location to an area greater than or equal to 3 square kilometers",
      },
      {
        id: "Precise location",
        label: "Precise location",
        description: "User or device physical location within an area less than 3 square kilometers",
      },
    ],
  },
  {
    category: "personal_info",
    label: "Personal info",
    types: [
      {
        id: "Name",
        label: "Name",
        description: "How a user refers to themselves, such as their first or last name, or nickname",
      },
      {
        id: "Email address",
        label: "Email address",
        description: "A user's email address",
      },
      {
        id: "User IDs",
        label: "User IDs",
        description: "Identifiers that relate to an identifiable person, such as an account ID, account number, or account name",
      },
      {
        id: "Address",
        label: "Address",
        description: "A user's address, such as a mailing or home address",
      },
      {
        id: "Phone number",
        label: "Phone number",
        description: "A user's phone number",
      },
      {
        id: "Race and ethnicity",
        label: "Race and ethnicity",
        description: "Information about a user's race or ethnicity",
      },
      {
        id: "Political or religious beliefs",
        label: "Political or religious beliefs",
        description: "Information about a user's political or religious beliefs",
      },
      {
        id: "Sexual orientation",
        label: "Sexual orientation",
        description: "Information about a user's sexual orientation",
      },
      {
        id: "Other info",
        label: "Other info",
        description: "Any other personal information such as date of birth, gender identity, veteran status, etc.",
      },
    ],
  },
  {
    category: "financial_info",
    label: "Financial info",
    types: [
      {
        id: "User payment info",
        label: "User payment info",
        description: "Information about a user's financial accounts such as credit card number",
      },
      {
        id: "Purchase history",
        label: "Purchase history",
        description: "Information about purchases or transactions made by a user",
      },
      {
        id: "Credit score",
        label: "Credit score",
        description: "Information about a user's credit score",
      },
      {
        id: "Other financial info",
        label: "Other financial info",
        description: "Any other financial information such as salary or debts",
      },
    ],
  },
  {
    category: "health_fitness",
    label: "Health and fitness",
    types: [
      {
        id: "Health info",
        label: "Health info",
        description: "Information about a user's health, such as medical records or symptoms",
      },
      {
        id: "Fitness info",
        label: "Fitness info",
        description: "Information about a user's fitness, such as exercise or other physical activity",
      },
    ],
  },
  {
    category: "messages",
    label: "Messages",
    types: [
      {
        id: "Emails",
        label: "Emails",
        description: "A user's emails including the email subject line, sender, recipients, and the content of the email",
      },
      {
        id: "SMS or MMS",
        label: "SMS or MMS",
        description: "A user's text messages including the sender, recipients, and the content of the message",
      },
      {
        id: "Other in-app messages",
        label: "Other in-app messages",
        description: "Any other types of messages such as instant messages or chat content",
      },
    ],
  },
  {
    category: "photos_videos",
    label: "Photos and videos",
    types: [
      {
        id: "Photos",
        label: "Photos",
        description: "A user's photos",
      },
      {
        id: "Videos",
        label: "Videos",
        description: "A user's videos",
      },
    ],
  },
  {
    category: "audio",
    label: "Audio files",
    types: [
      {
        id: "Voice or sound recordings",
        label: "Voice or sound recordings",
        description: "A user's voice such as a voicemail or a sound recording",
      },
      {
        id: "Music files",
        label: "Music files",
        description: "A user's music files",
      },
      {
        id: "Other audio files",
        label: "Other audio files",
        description: "Any other user-created or user-provided audio files",
      },
    ],
  },
  {
    category: "files_docs",
    label: "Files and docs",
    types: [
      {
        id: "Files and docs",
        label: "Files and docs",
        description: "A user's files or documents, or information about their files or documents such as file names",
      },
    ],
  },
  {
    category: "calendar",
    label: "Calendar",
    types: [
      {
        id: "Calendar events",
        label: "Calendar events",
        description: "Information from a user's calendar such as events, event notes, and attendees",
      },
    ],
  },
  {
    category: "contacts",
    label: "Contacts",
    types: [
      {
        id: "Contacts",
        label: "Contacts",
        description: "Information about the user's contacts such as contact names, message history, and social graph information",
      },
    ],
  },
  {
    category: "app_activity",
    label: "App activity",
    types: [
      {
        id: "App interactions",
        label: "App interactions",
        description: "Information about how a user interacts with the app, such as page views and taps",
      },
      {
        id: "In-app search history",
        label: "In-app search history",
        description: "Information about what a user has searched for in the app",
      },
      {
        id: "Installed apps",
        label: "Installed apps",
        description: "Information about the apps installed on a user's device",
      },
      {
        id: "Other user-generated content",
        label: "Other user-generated content",
        description: "Any other user-generated content not listed here",
      },
      {
        id: "Other actions",
        label: "Other actions",
        description: "Any other user activity or actions in-app not listed here",
      },
    ],
  },
  {
    category: "web_browsing",
    label: "Web browsing",
    types: [
      {
        id: "Web browsing history",
        label: "Web browsing history",
        description: "Information about the websites a user has visited",
      },
    ],
  },
  {
    category: "app_info_performance",
    label: "App info and performance",
    types: [
      {
        id: "Crash logs",
        label: "Crash logs",
        description: "Crash log data from the app",
      },
      {
        id: "Diagnostics",
        label: "Diagnostics",
        description: "Information about the performance of the app such as battery life, loading time, latency, framerate, or any technical diagnostics",
      },
      {
        id: "Other app performance data",
        label: "Other app performance data",
        description: "Any other app performance data not listed here",
      },
    ],
  },
  {
    category: "device_ids",
    label: "Device or other IDs",
    types: [
      {
        id: "Device or other IDs",
        label: "Device or other IDs",
        description: "Identifiers that relate to an individual device, browser, or app such as an IMEI number, MAC address, Widevine Device ID, Firebase installation ID, or advertising identifier",
      },
    ],
  },
];

export const GP_DATA_PURPOSES: PrivacyPurpose[] = [
  {
    id: "app_functionality",
    label: "App functionality",
    description: "Used for features that are available in the app",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Used to collect data about how users use the app or how the app performs",
  },
  {
    id: "developer_communications",
    label: "Developer communications",
    description: "Used to send news or notifications about the app or the developer",
  },
  {
    id: "advertising_marketing",
    label: "Advertising or marketing",
    description: "Used to display or target ads or marketing communications, or measure ad performance",
  },
  {
    id: "fraud_prevention",
    label: "Fraud prevention, security, and compliance",
    description: "Used for fraud prevention, security, or compliance with laws",
  },
  {
    id: "personalization",
    label: "Personalization",
    description: "Used to customize the app, such as showing recommended content or suggestions",
  },
  {
    id: "account_management",
    label: "Account management",
    description: "Used for the setup or management of a user's account with the developer",
  },
];
