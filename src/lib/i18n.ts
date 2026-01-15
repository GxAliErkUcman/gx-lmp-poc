import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Default translation resources (bundled)
const resources = {
  en: {
    common: {
      nav: {
        yourLocations: "Your Locations",
        accountSettings: "Account Settings",
        signOut: "Sign Out",
        adminPanel: "Admin Panel"
      },
      actions: {
        add: "Add",
        import: "Import",
        export: "Export",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        search: "Search",
        filter: "Filter",
        refresh: "Refresh",
        close: "Close",
        confirm: "Confirm",
        submit: "Submit",
        update: "Update"
      },
      tabs: {
        activeLocations: "Active Locations",
        needAttention: "Need Attention",
        clientOverview: "Client Overview",
        allClients: "All Clients",
        users: "Users",
        translations: "Translations"
      },
      settings: {
        title: "Account Settings",
        appearance: "Appearance",
        security: "Security",
        language: "Language",
        changePassword: "Change Password",
        account: "Account",
        email: "Email",
        role: "Role"
      },
      theme: {
        light: "Light",
        dark: "Dark",
        system: "System"
      },
      status: {
        active: "Active",
        pending: "Pending",
        loading: "Loading...",
        noResults: "No results found"
      },
      messages: {
        success: "Success",
        error: "Error",
        saved: "Changes saved successfully",
        deleted: "Deleted successfully",
        confirmDelete: "Are you sure you want to delete this?"
      }
    },
    fields: {
      storeCode: "Store Code",
      businessName: "Name des Unternehmens",
      addressLine1: "Street Address",
      addressLine2: "Address Line 2",
      addressLine3: "Address Line 3",
      addressLine4: "Address Line 4",
      addressLine5: "Address Line 5",
      country: "Country",
      city: "City",
      state: "State/Province",
      postalCode: "Postal Code",
      district: "District",
      primaryCategory: "Primary Category",
      additionalCategories: "Additional Categories",
      website: "Website",
      primaryPhone: "Primary Phone",
      additionalPhones: "Additional Phones",
      fromTheBusiness: "Beschreibung des Unternehmens",
      openingDate: "Opening Date",
      labels: "Labels",
      temporarilyClosed: "Temporarily Closed",
      latitude: "Latitude",
      longitude: "Longitude",
      logoPhoto: "Logo Photo",
      coverPhoto: "Cover Photo",
      otherPhotos: "Other Photos",
      appointmentURL: "Appointment URL",
      menuURL: "Menu URL",
      reservationsURL: "Reservations URL",
      orderAheadURL: "Order Ahead URL",
      adwords: "AdWords Phone",
      goldmine: "Notes (Internal)",
      socialMedia: "Social Media",
      openingHours: "Opening Hours",
      specialHours: "Special Hours",
      moreHours: "More Hours"
    },
    days: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday"
    },
    validation: {
      required: "This field is required",
      storeCodeRequired: "Store code is required",
      businessNameRequired: "Business name is required",
      addressRequired: "Street address is required",
      countryRequired: "Country is required",
      categoryRequired: "Primary category is required",
      invalidUrl: "Invalid URL format",
      invalidPhone: "Invalid phone number format",
      invalidEmail: "Invalid email format",
      passwordTooShort: "Password must be at least 8 characters",
      passwordsMustMatch: "Passwords do not match",
      invalidDate: "Invalid date format",
      futureDate: "Date cannot be in the future",
      maxLength: "Maximum {{max}} characters allowed",
      invalidFormat: "Invalid format"
    }
  },
  de: {
    common: {
      nav: {
        yourLocations: "Ihre Standorte",
        accountSettings: "Kontoeinstellungen",
        signOut: "Abmelden",
        adminPanel: "Admin-Bereich"
      },
      actions: {
        add: "Hinzufügen",
        import: "Importieren",
        export: "Exportieren",
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Löschen",
        edit: "Bearbeiten",
        search: "Suchen",
        filter: "Filtern",
        refresh: "Aktualisieren",
        close: "Schließen",
        confirm: "Bestätigen",
        submit: "Absenden",
        update: "Aktualisieren"
      },
      tabs: {
        activeLocations: "Aktive Standorte",
        needAttention: "Handlungsbedarf",
        clientOverview: "Kundenübersicht",
        allClients: "Alle Kunden",
        users: "Benutzer",
        translations: "Übersetzungen"
      },
      settings: {
        title: "Kontoeinstellungen",
        appearance: "Erscheinungsbild",
        security: "Sicherheit",
        language: "Sprache",
        changePassword: "Passwort ändern",
        account: "Konto",
        email: "E-Mail",
        role: "Rolle"
      },
      theme: {
        light: "Hell",
        dark: "Dunkel",
        system: "System"
      },
      status: {
        active: "Aktiv",
        pending: "Ausstehend",
        loading: "Laden...",
        noResults: "Keine Ergebnisse gefunden"
      },
      messages: {
        success: "Erfolg",
        error: "Fehler",
        saved: "Änderungen erfolgreich gespeichert",
        deleted: "Erfolgreich gelöscht",
        confirmDelete: "Sind Sie sicher, dass Sie dies löschen möchten?"
      }
    },
    fields: {
      storeCode: "Store Code",
      businessName: "Name des Unternehmens",
      addressLine1: "Straßenadresse",
      addressLine2: "Adresszeile 2",
      addressLine3: "Adresszeile 3",
      addressLine4: "Adresszeile 4",
      addressLine5: "Adresszeile 5",
      country: "Land",
      city: "Stadt",
      state: "Bundesland",
      postalCode: "Postleitzahl",
      district: "Bezirk",
      primaryCategory: "Hauptkategorie",
      additionalCategories: "Zusätzliche Kategorien",
      website: "Website",
      primaryPhone: "Haupttelefon",
      additionalPhones: "Weitere Telefonnummern",
      fromTheBusiness: "Beschreibung des Unternehmens",
      openingDate: "Eröffnungsdatum",
      labels: "Labels",
      temporarilyClosed: "Vorübergehend geschlossen",
      latitude: "Breitengrad",
      longitude: "Längengrad",
      logoPhoto: "Logo-Foto",
      coverPhoto: "Titelbild",
      otherPhotos: "Weitere Fotos",
      appointmentURL: "Termin-URL",
      menuURL: "Menü-URL",
      reservationsURL: "Reservierungs-URL",
      orderAheadURL: "Vorbestellungs-URL",
      adwords: "AdWords-Telefon",
      goldmine: "Notizen (Intern)",
      socialMedia: "Soziale Medien",
      openingHours: "Öffnungszeiten",
      specialHours: "Sonderöffnungszeiten",
      moreHours: "Weitere Öffnungszeiten"
    },
    days: {
      monday: "Montag",
      tuesday: "Dienstag",
      wednesday: "Mittwoch",
      thursday: "Donnerstag",
      friday: "Freitag",
      saturday: "Samstag",
      sunday: "Sonntag"
    },
    validation: {
      required: "Dieses Feld ist erforderlich",
      storeCodeRequired: "Store Code ist erforderlich",
      businessNameRequired: "Unternehmensname ist erforderlich",
      addressRequired: "Straßenadresse ist erforderlich",
      countryRequired: "Land ist erforderlich",
      categoryRequired: "Hauptkategorie ist erforderlich",
      invalidUrl: "Ungültiges URL-Format",
      invalidPhone: "Ungültiges Telefonnummernformat",
      invalidEmail: "Ungültiges E-Mail-Format",
      passwordTooShort: "Passwort muss mindestens 8 Zeichen lang sein",
      passwordsMustMatch: "Passwörter stimmen nicht überein",
      invalidDate: "Ungültiges Datumsformat",
      futureDate: "Datum darf nicht in der Zukunft liegen",
      maxLength: "Maximal {{max}} Zeichen erlaubt",
      invalidFormat: "Ungültiges Format"
    }
  }
};

// Get custom translations from localStorage (these override defaults)
export const getStoredTranslations = (lang: string) => {
  try {
    const stored = localStorage.getItem(`translations_${lang}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Save custom translations to localStorage
export const saveTranslations = (lang: string, translations: Record<string, any>) => {
  localStorage.setItem(`translations_${lang}`, JSON.stringify(translations));
  // Reload translations in i18next
  Object.keys(translations).forEach(namespace => {
    i18n.addResourceBundle(lang, namespace, translations[namespace], true, true);
  });
};

// Get all translations for a language (merged default + custom)
export const getAllTranslations = (lang: string) => {
  const defaults = resources[lang as keyof typeof resources] || resources.en;
  const custom = getStoredTranslations(lang);
  
  if (!custom) return defaults;
  
  // Deep merge custom over defaults
  return deepMerge(defaults, custom);
};

// Deep merge helper
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Get the default (original English) translations
export const getDefaultTranslations = () => resources.en;

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'fields', 'days', 'validation'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Load any custom translations from localStorage
const languages = ['en', 'de'];
languages.forEach(lang => {
  const custom = getStoredTranslations(lang);
  if (custom) {
    Object.keys(custom).forEach(namespace => {
      i18n.addResourceBundle(lang, namespace, custom[namespace], true, true);
    });
  }
});

export default i18n;
