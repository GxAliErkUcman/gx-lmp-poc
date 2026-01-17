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
        adminPanel: "Admin Panel",
        backToOverview: "Back to Overview"
      },
      actions: {
        add: "Add",
        import: "Import",
        export: "Export",
        exportJson: "Export JSON",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        search: "Search",
        filter: "Filter",
        refresh: "Refresh",
        close: "Close",
        closed: "Closed",
        confirm: "Confirm",
        submit: "Submit",
        update: "Update",
        updateCoordinates: "Update Coordinates",
        copyCoordinates: "Copy Coordinates",
        openInBingMaps: "Open in Bing Maps",
        useCurrentLocation: "Use Current Location",
        findFromAddress: "Find from Address",
        gettingLocation: "Getting Location...",
        geocoding: "Geocoding...",
        addSingleDate: "Add Single Date",
        addDateRange: "Add Date Range",
        manageCustomServices: "Manage Custom Services",
        addBusiness: "Add Business",
        addFirstBusiness: "Add Your First Business",
        createUser: "Create User",
        versionHistory: "Version History",
        settings: "Settings",
        customServices: "Custom Services"
      },
      tabs: {
        activeLocations: "Active Locations",
        needAttention: "Need Attention",
        new: "New",
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
        noResults: "No results found",
        open: "Open",
        total: "Total"
      },
      messages: {
        success: "Success",
        error: "Error",
        saved: "Changes saved successfully",
        deleted: "Deleted successfully",
        confirmDelete: "Are you sure you want to delete this?",
        noBusinessesFound: "No businesses found for this client",
        createUserDescription: "Create Client Admins, Users, or Store Owners for this client"
      },
      sections: {
        basicInformation: "Basic Information",
        addressInformation: "Address Information",
        locationCoordinates: "Location Coordinates",
        contactInformation: "Contact Information",
        socialMedia: "Social Media",
        businessDates: "Business Dates",
        openingHours: "Opening Hours",
        specialHours: "Special Hours",
        coverPhoto: "Cover Photo",
        logoPhoto: "Logo Photo",
        serviceUrls: "Service URLs",
        customServices: "Custom Services",
        dataGoldmine: "Data Goldmine"
      },
      location: {
        currentCoordinates: "Current Coordinates",
        useCurrentLocationHint: "Use \"Current Location\" to auto-detect your position",
        findFromAddressHint: "Use \"Find from Address\" to geocode the address you entered",
        manualEntryHint: "You can also manually enter precise coordinates"
      },
      specialHours: {
        description: "Set special hours for holidays and other exceptions. These override regular opening hours.",
        noHoursAdded: "No special hours added yet",
        clickToStart: "Click \"Add Special Hours\" to get started",
        date: "Date",
        hours: "Hours",
        pickDate: "Pick a date",
        selectDateRange: "Select Date Range",
        hoursForAllDays: "Hours for All Selected Days",
        applyToAllDates: "Apply to All Dates",
        daysSelected: "days",
        selected: "Selected",
        generatedFormat: "Generated Format"
      },
      openingHours: {
        weekdays9to6: "Weekdays 9-6",
        weekdays8to5: "Weekdays 8-5",
        weekend10to2: "Weekend 10-2",
        closeWeekends: "Close Weekends",
        customFormat: "Custom Format (Advanced)"
      },
      photos: {
        dragAndDrop: "Drag & drop photos here, or click to select",
        dropHere: "Drop photos here",
        photosUploaded: "photos uploaded"
      },
      dialog: {
        editBusiness: "Edit Business",
        addNewBusiness: "Add New Business",
        updateBusinessInfo: "Update business information",
        enterBusinessDetails: "Enter the details for your new business location",
        saving: "Saving...",
        updateBusiness: "Update Business",
        createBusiness: "Create Business"
      }
    },
    fields: {
      storeCode: "Store Code",
      businessName: "Business Name",
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
      fromTheBusiness: "From the Business",
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
      unstructuredData: "Unstructured Data",
      socialMedia: "Social Media",
      openingHours: "Opening Hours",
      specialHours: "Special Hours",
      moreHours: "More Hours",
      facebookUrl: "Facebook URL",
      instagramUrl: "Instagram URL",
      linkedinUrl: "LinkedIn URL",
      pinterestUrl: "Pinterest URL",
      tiktokUrl: "TikTok URL",
      twitterUrl: "Twitter/X URL",
      youtubeUrl: "YouTube URL"
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
    },
    placeholders: {
      briefDescription: "Brief description of your business (max 750 characters)",
      labelsExample: "e.g., Family-friendly, Organic, Free Wi-Fi (comma-separated)",
      additionalCategoriesMax: "Comma-separated additional categories (max 10)",
      selectCountry: "Select country",
      phonePlaceholder: "+1-555-123-4567",
      additionalPhonesPlaceholder: "Comma-separated phone numbers",
      goldminePlaceholder: "Store unstructured data here (not included in JSON exports)",
      goldmineDescription: "This field is for storing raw/unstructured data and is excluded from all JSON exports.",
      noCustomServices: "No custom services assigned yet."
    }
  },
  de: {
    common: {
      nav: {
        yourLocations: "Ihre Standorte",
        accountSettings: "Kontoeinstellungen",
        signOut: "Abmelden",
        adminPanel: "Admin-Bereich",
        backToOverview: "Zurück zur Übersicht"
      },
      actions: {
        add: "Hinzufügen",
        import: "Importieren",
        export: "Exportieren",
        exportJson: "JSON exportieren",
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Löschen",
        edit: "Bearbeiten",
        search: "Suchen",
        filter: "Filtern",
        refresh: "Aktualisieren",
        close: "Schließen",
        closed: "Geschlossen",
        confirm: "Bestätigen",
        submit: "Absenden",
        update: "Aktualisieren",
        updateCoordinates: "Koordinaten aktualisieren",
        copyCoordinates: "Koordinaten kopieren",
        openInBingMaps: "In Bing Maps öffnen",
        useCurrentLocation: "Aktuellen Standort verwenden",
        findFromAddress: "Von Adresse suchen",
        gettingLocation: "Standort wird ermittelt...",
        geocoding: "Geocodierung...",
        addSingleDate: "Einzeldatum hinzufügen",
        addDateRange: "Datumsbereich hinzufügen",
        manageCustomServices: "Individuelle Dienste verwalten",
        addBusiness: "Unternehmen hinzufügen",
        addFirstBusiness: "Erstes Unternehmen hinzufügen",
        createUser: "Benutzer erstellen",
        versionHistory: "Versionshistorie",
        settings: "Einstellungen",
        customServices: "Individuelle Dienste"
      },
      tabs: {
        activeLocations: "Aktive Standorte",
        needAttention: "Handlungsbedarf",
        new: "Neu",
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
        noResults: "Keine Ergebnisse gefunden",
        open: "Geöffnet",
        total: "Gesamt"
      },
      messages: {
        success: "Erfolg",
        error: "Fehler",
        saved: "Änderungen erfolgreich gespeichert",
        deleted: "Erfolgreich gelöscht",
        confirmDelete: "Sind Sie sicher, dass Sie dies löschen möchten?",
        noBusinessesFound: "Keine Unternehmen für diesen Kunden gefunden",
        createUserDescription: "Erstellen Sie Client-Admins, Benutzer oder Store-Besitzer für diesen Kunden"
      },
      sections: {
        basicInformation: "Grundlegende Informationen",
        addressInformation: "Adressinformationen",
        locationCoordinates: "Standortkoordinaten",
        contactInformation: "Kontaktinformationen",
        socialMedia: "Soziale Medien",
        businessDates: "Geschäftsdaten",
        openingHours: "Öffnungszeiten",
        specialHours: "Sonderöffnungszeiten",
        coverPhoto: "Titelbild",
        logoPhoto: "Logo-Foto",
        serviceUrls: "Service-URLs",
        customServices: "Individuelle Dienste",
        dataGoldmine: "Daten-Goldmine"
      },
      location: {
        currentCoordinates: "Aktuelle Koordinaten",
        useCurrentLocationHint: "Verwenden Sie \"Aktuellen Standort\", um Ihre Position automatisch zu erkennen",
        findFromAddressHint: "Verwenden Sie \"Von Adresse suchen\", um die eingegebene Adresse zu geocodieren",
        manualEntryHint: "Sie können auch präzise Koordinaten manuell eingeben"
      },
      specialHours: {
        description: "Legen Sie Sonderöffnungszeiten für Feiertage und andere Ausnahmen fest. Diese überschreiben die regulären Öffnungszeiten.",
        noHoursAdded: "Noch keine Sonderöffnungszeiten hinzugefügt",
        clickToStart: "Klicken Sie auf \"Sonderöffnungszeiten hinzufügen\", um zu beginnen",
        date: "Datum",
        hours: "Stunden",
        pickDate: "Datum auswählen",
        selectDateRange: "Datumsbereich auswählen",
        hoursForAllDays: "Öffnungszeiten für alle ausgewählten Tage",
        applyToAllDates: "Auf alle Tage anwenden",
        daysSelected: "Tage",
        selected: "Ausgewählt",
        generatedFormat: "Generiertes Format"
      },
      openingHours: {
        weekdays9to6: "Wochentage 9-18",
        weekdays8to5: "Wochentage 8-17",
        weekend10to2: "Wochenende 10-14",
        closeWeekends: "Wochenenden schließen",
        customFormat: "Benutzerdefiniertes Format (Erweitert)"
      },
      photos: {
        dragAndDrop: "Fotos hierher ziehen oder klicken zum Auswählen",
        dropHere: "Fotos hier ablegen",
        photosUploaded: "Fotos hochgeladen"
      },
      dialog: {
        editBusiness: "Unternehmen bearbeiten",
        addNewBusiness: "Neues Unternehmen hinzufügen",
        updateBusinessInfo: "Unternehmensinformationen aktualisieren",
        enterBusinessDetails: "Geben Sie die Details für Ihren neuen Unternehmensstandort ein",
        saving: "Speichern...",
        updateBusiness: "Unternehmen aktualisieren",
        createBusiness: "Unternehmen erstellen"
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
      unstructuredData: "Unstrukturierte Daten",
      socialMedia: "Soziale Medien",
      openingHours: "Öffnungszeiten",
      specialHours: "Sonderöffnungszeiten",
      moreHours: "Weitere Öffnungszeiten",
      facebookUrl: "Facebook URL",
      instagramUrl: "Instagram URL",
      linkedinUrl: "LinkedIn URL",
      pinterestUrl: "Pinterest URL",
      tiktokUrl: "TikTok URL",
      twitterUrl: "Twitter/X URL",
      youtubeUrl: "YouTube URL"
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
    },
    placeholders: {
      briefDescription: "Kurze Beschreibung Ihres Unternehmens (max. 750 Zeichen)",
      labelsExample: "z.B. Familienfreundlich, Bio, Kostenloses WLAN (kommagetrennt)",
      additionalCategoriesMax: "Kommagetrennte zusätzliche Kategorien (max. 10)",
      selectCountry: "Land auswählen",
      phonePlaceholder: "+49-123-456789",
      additionalPhonesPlaceholder: "Kommagetrennte Telefonnummern",
      goldminePlaceholder: "Unstrukturierte Daten hier speichern (nicht in JSON-Exporten enthalten)",
      goldmineDescription: "Dieses Feld dient zum Speichern von Rohdaten/unstrukturierten Daten und ist von allen JSON-Exporten ausgeschlossen.",
      noCustomServices: "Noch keine individuellen Dienste zugewiesen."
    }
  }
};

// French translations (bundled)
const frenchTranslations = {
  common: {
    nav: {
      yourLocations: "Vos Emplacements",
      accountSettings: "Paramètres du Compte",
      signOut: "Déconnexion",
      adminPanel: "Panneau d'Administration",
      backToOverview: "Retour à l'Aperçu"
    },
    actions: {
      add: "Ajouter",
      import: "Importer",
      export: "Exporter",
      exportJson: "Exporter JSON",
      save: "Enregistrer",
      cancel: "Annuler",
      delete: "Supprimer",
      edit: "Modifier",
      search: "Rechercher",
      filter: "Filtrer",
      refresh: "Actualiser",
      close: "Fermer",
      closed: "Fermé",
      confirm: "Confirmer",
      submit: "Soumettre",
      update: "Mettre à jour",
      updateCoordinates: "Mettre à jour les Coordonnées",
      copyCoordinates: "Copier les Coordonnées",
      openInBingMaps: "Ouvrir dans Bing Maps",
      useCurrentLocation: "Utiliser la Position Actuelle",
      findFromAddress: "Trouver depuis l'Adresse",
      gettingLocation: "Obtention de la Position...",
      geocoding: "Géocodage...",
      addSingleDate: "Ajouter une Date",
      addDateRange: "Ajouter une Plage de Dates",
      manageCustomServices: "Gérer les Services Personnalisés",
      addBusiness: "Ajouter une Entreprise",
      addFirstBusiness: "Ajoutez Votre Première Entreprise",
      createUser: "Créer un Utilisateur",
      versionHistory: "Historique des Versions",
      settings: "Paramètres",
      customServices: "Services Personnalisés"
    },
    tabs: {
      activeLocations: "Emplacements Actifs",
      needAttention: "Nécessitent Attention",
      new: "Nouveau",
      clientOverview: "Aperçu des Clients",
      allClients: "Tous les Clients",
      users: "Utilisateurs",
      translations: "Traductions"
    },
    settings: {
      title: "Paramètres du Compte",
      appearance: "Apparence",
      security: "Sécurité",
      language: "Langue",
      changePassword: "Changer le Mot de Passe",
      account: "Compte",
      email: "E-mail",
      role: "Rôle"
    },
    theme: {
      light: "Clair",
      dark: "Sombre",
      system: "Système"
    },
    status: {
      active: "Actif",
      pending: "En attente",
      loading: "Chargement...",
      noResults: "Aucun résultat trouvé",
      open: "Ouvert",
      total: "Total"
    },
    messages: {
      success: "Succès",
      error: "Erreur",
      saved: "Modifications enregistrées avec succès",
      deleted: "Supprimé avec succès",
      confirmDelete: "Êtes-vous sûr de vouloir supprimer ceci ?",
      noBusinessesFound: "Aucune entreprise trouvée pour ce client",
      createUserDescription: "Créer des Administrateurs Client, Utilisateurs ou Propriétaires de Magasin pour ce client"
    },
    sections: {
      basicInformation: "Informations de Base",
      addressInformation: "Informations d'Adresse",
      locationCoordinates: "Coordonnées de l'Emplacement",
      contactInformation: "Informations de Contact",
      socialMedia: "Réseaux Sociaux",
      businessDates: "Dates de l'Entreprise",
      openingHours: "Heures d'Ouverture",
      specialHours: "Heures Spéciales",
      coverPhoto: "Photo de Couverture",
      logoPhoto: "Photo du Logo",
      serviceUrls: "URLs des Services",
      customServices: "Services Personnalisés",
      dataGoldmine: "Dépôt de Données"
    },
    location: {
      currentCoordinates: "Coordonnées Actuelles",
      useCurrentLocationHint: "Utilisez \"Position Actuelle\" pour détecter automatiquement votre position",
      findFromAddressHint: "Utilisez \"Trouver depuis l'Adresse\" pour géocoder l'adresse saisie",
      manualEntryHint: "Vous pouvez également saisir manuellement des coordonnées précises"
    },
    specialHours: {
      description: "Définissez des heures spéciales pour les jours fériés et autres exceptions. Celles-ci remplacent les heures d'ouverture régulières.",
      noHoursAdded: "Aucune heure spéciale ajoutée",
      clickToStart: "Cliquez sur \"Ajouter des Heures Spéciales\" pour commencer",
      date: "Date",
      hours: "Heures",
      pickDate: "Choisir une date",
      selectDateRange: "Sélectionner une Plage de Dates",
      hoursForAllDays: "Heures pour Tous les Jours Sélectionnés",
      applyToAllDates: "Appliquer à Toutes les Dates",
      daysSelected: "jours",
      selected: "Sélectionné",
      generatedFormat: "Format Généré"
    },
    openingHours: {
      weekdays9to6: "Jours ouvrables 9h-18h",
      weekdays8to5: "Jours ouvrables 8h-17h",
      weekend10to2: "Week-end 10h-14h",
      closeWeekends: "Fermé les week-ends",
      customFormat: "Format Personnalisé (Avancé)"
    },
    photos: {
      dragAndDrop: "Glissez-déposez des photos ici, ou cliquez pour sélectionner",
      dropHere: "Déposez les photos ici",
      photosUploaded: "photos téléchargées"
    },
    dialog: {
      editBusiness: "Modifier l'Entreprise",
      addNewBusiness: "Ajouter une Nouvelle Entreprise",
      updateBusinessInfo: "Mettre à jour les informations de l'entreprise",
      enterBusinessDetails: "Entrez les détails de votre nouvel emplacement d'entreprise",
      saving: "Enregistrement...",
      updateBusiness: "Mettre à jour l'Entreprise",
      createBusiness: "Créer une Entreprise"
    }
  },
  fields: {
    storeCode: "Code du Magasin",
    businessName: "Nom de l'Entreprise",
    addressLine1: "Adresse",
    addressLine2: "Ligne d'Adresse 2",
    addressLine3: "Ligne d'Adresse 3",
    addressLine4: "Ligne d'Adresse 4",
    addressLine5: "Ligne d'Adresse 5",
    country: "Pays",
    city: "Ville",
    state: "État/Province",
    postalCode: "Code Postal",
    district: "District",
    primaryCategory: "Catégorie Principale",
    additionalCategories: "Catégories Supplémentaires",
    website: "Site Web",
    primaryPhone: "Téléphone Principal",
    additionalPhones: "Téléphones Supplémentaires",
    fromTheBusiness: "À Propos de l'Entreprise",
    openingDate: "Date d'Ouverture",
    labels: "Étiquettes",
    temporarilyClosed: "Temporairement Fermé",
    latitude: "Latitude",
    longitude: "Longitude",
    logoPhoto: "Photo du Logo",
    coverPhoto: "Photo de Couverture",
    otherPhotos: "Autres Photos",
    appointmentURL: "URL de Rendez-vous",
    menuURL: "URL du Menu",
    reservationsURL: "URL de Réservations",
    orderAheadURL: "URL de Commande Anticipée",
    adwords: "Téléphone AdWords",
    goldmine: "Notes (Interne)",
    unstructuredData: "Données Non Structurées",
    socialMedia: "Réseaux Sociaux",
    openingHours: "Heures d'Ouverture",
    specialHours: "Heures Spéciales",
    moreHours: "Plus d'Heures",
    facebookUrl: "URL Facebook",
    instagramUrl: "URL Instagram",
    linkedinUrl: "URL LinkedIn",
    pinterestUrl: "URL Pinterest",
    tiktokUrl: "URL TikTok",
    twitterUrl: "URL Twitter/X",
    youtubeUrl: "URL YouTube"
  },
  days: {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche"
  },
  validation: {
    required: "Ce champ est obligatoire",
    storeCodeRequired: "Le code du magasin est obligatoire",
    businessNameRequired: "Le nom de l'entreprise est obligatoire",
    addressRequired: "L'adresse est obligatoire",
    countryRequired: "Le pays est obligatoire",
    categoryRequired: "La catégorie principale est obligatoire",
    invalidUrl: "Format d'URL invalide",
    invalidPhone: "Format de numéro de téléphone invalide",
    invalidEmail: "Format d'e-mail invalide",
    passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères",
    passwordsMustMatch: "Les mots de passe ne correspondent pas",
    invalidDate: "Format de date invalide",
    futureDate: "La date ne peut pas être dans le futur",
    maxLength: "Maximum {{max}} caractères autorisés",
    invalidFormat: "Format invalide"
  },
  placeholders: {
    briefDescription: "Brève description de votre entreprise (max. 750 caractères)",
    labelsExample: "ex., Familial, Bio, Wi-Fi Gratuit (séparés par des virgules)",
    additionalCategoriesMax: "Catégories supplémentaires séparées par des virgules (max. 10)",
    selectCountry: "Sélectionner un pays",
    phonePlaceholder: "+33-1-23-45-67-89",
    additionalPhonesPlaceholder: "Numéros de téléphone séparés par des virgules",
    goldminePlaceholder: "Stockez des données non structurées ici (non incluses dans les exportations JSON)",
    goldmineDescription: "Ce champ sert à stocker des données brutes/non structurées et est exclu de toutes les exportations JSON.",
    noCustomServices: "Aucun service personnalisé assigné."
  }
};

// Spanish translations (bundled)
const spanishTranslations = {
  common: {
    nav: {
      yourLocations: "Tus Ubicaciones",
      accountSettings: "Configuración de Cuenta",
      signOut: "Cerrar Sesión",
      adminPanel: "Panel de Administración",
      backToOverview: "Volver al Resumen"
    },
    actions: {
      add: "Añadir",
      import: "Importar",
      export: "Exportar",
      exportJson: "Exportar JSON",
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      search: "Buscar",
      filter: "Filtrar",
      refresh: "Actualizar",
      close: "Cerrar",
      closed: "Cerrado",
      confirm: "Confirmar",
      submit: "Enviar",
      update: "Actualizar",
      updateCoordinates: "Actualizar Coordenadas",
      copyCoordinates: "Copiar Coordenadas",
      openInBingMaps: "Abrir en Bing Maps",
      useCurrentLocation: "Usar Ubicación Actual",
      findFromAddress: "Buscar desde Dirección",
      gettingLocation: "Obteniendo Ubicación...",
      geocoding: "Geocodificando...",
      addSingleDate: "Añadir Fecha Individual",
      addDateRange: "Añadir Rango de Fechas",
      manageCustomServices: "Gestionar Servicios Personalizados",
      addBusiness: "Añadir Negocio",
      addFirstBusiness: "Añade Tu Primer Negocio",
      createUser: "Crear Usuario",
      versionHistory: "Historial de Versiones",
      settings: "Configuración",
      customServices: "Servicios Personalizados"
    },
    tabs: {
      activeLocations: "Ubicaciones Activas",
      needAttention: "Requieren Atención",
      new: "Nuevo",
      clientOverview: "Resumen de Clientes",
      allClients: "Todos los Clientes",
      users: "Usuarios",
      translations: "Traducciones"
    },
    settings: {
      title: "Configuración de Cuenta",
      appearance: "Apariencia",
      security: "Seguridad",
      language: "Idioma",
      changePassword: "Cambiar Contraseña",
      account: "Cuenta",
      email: "Correo Electrónico",
      role: "Rol"
    },
    theme: {
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema"
    },
    status: {
      active: "Activo",
      pending: "Pendiente",
      loading: "Cargando...",
      noResults: "No se encontraron resultados",
      open: "Abierto",
      total: "Total"
    },
    messages: {
      success: "Éxito",
      error: "Error",
      saved: "Cambios guardados correctamente",
      deleted: "Eliminado correctamente",
      confirmDelete: "¿Estás seguro de que quieres eliminar esto?",
      noBusinessesFound: "No se encontraron negocios para este cliente",
      createUserDescription: "Crear Administradores de Cliente, Usuarios o Propietarios de Tienda para este cliente"
    },
    sections: {
      basicInformation: "Información Básica",
      addressInformation: "Información de Dirección",
      locationCoordinates: "Coordenadas de Ubicación",
      contactInformation: "Información de Contacto",
      socialMedia: "Redes Sociales",
      businessDates: "Fechas del Negocio",
      openingHours: "Horario de Apertura",
      specialHours: "Horarios Especiales",
      coverPhoto: "Foto de Portada",
      logoPhoto: "Foto del Logo",
      serviceUrls: "URLs de Servicios",
      customServices: "Servicios Personalizados",
      dataGoldmine: "Depósito de Datos"
    },
    location: {
      currentCoordinates: "Coordenadas Actuales",
      useCurrentLocationHint: "Usa \"Ubicación Actual\" para detectar tu posición automáticamente",
      findFromAddressHint: "Usa \"Buscar desde Dirección\" para geocodificar la dirección ingresada",
      manualEntryHint: "También puedes ingresar coordenadas precisas manualmente"
    },
    specialHours: {
      description: "Establece horarios especiales para festivos y otras excepciones. Estos anulan los horarios regulares.",
      noHoursAdded: "Aún no se han añadido horarios especiales",
      clickToStart: "Haz clic en \"Añadir Horarios Especiales\" para comenzar",
      date: "Fecha",
      hours: "Horas",
      pickDate: "Seleccionar fecha",
      selectDateRange: "Seleccionar Rango de Fechas",
      hoursForAllDays: "Horario para Todos los Días Seleccionados",
      applyToAllDates: "Aplicar a Todas las Fechas",
      daysSelected: "días",
      selected: "Seleccionado",
      generatedFormat: "Formato Generado"
    },
    openingHours: {
      weekdays9to6: "Días laborables 9-18",
      weekdays8to5: "Días laborables 8-17",
      weekend10to2: "Fin de semana 10-14",
      closeWeekends: "Cerrar fines de semana",
      customFormat: "Formato Personalizado (Avanzado)"
    },
    photos: {
      dragAndDrop: "Arrastra y suelta fotos aquí, o haz clic para seleccionar",
      dropHere: "Suelta las fotos aquí",
      photosUploaded: "fotos subidas"
    },
    dialog: {
      editBusiness: "Editar Negocio",
      addNewBusiness: "Añadir Nuevo Negocio",
      updateBusinessInfo: "Actualizar información del negocio",
      enterBusinessDetails: "Ingresa los detalles de tu nueva ubicación de negocio",
      saving: "Guardando...",
      updateBusiness: "Actualizar Negocio",
      createBusiness: "Crear Negocio"
    }
  },
  fields: {
    storeCode: "Código de Tienda",
    businessName: "Nombre del Negocio",
    addressLine1: "Dirección",
    addressLine2: "Línea de Dirección 2",
    addressLine3: "Línea de Dirección 3",
    addressLine4: "Línea de Dirección 4",
    addressLine5: "Línea de Dirección 5",
    country: "País",
    city: "Ciudad",
    state: "Estado/Provincia",
    postalCode: "Código Postal",
    district: "Distrito",
    primaryCategory: "Categoría Principal",
    additionalCategories: "Categorías Adicionales",
    website: "Sitio Web",
    primaryPhone: "Teléfono Principal",
    additionalPhones: "Teléfonos Adicionales",
    fromTheBusiness: "Sobre el Negocio",
    openingDate: "Fecha de Apertura",
    labels: "Etiquetas",
    temporarilyClosed: "Cerrado Temporalmente",
    latitude: "Latitud",
    longitude: "Longitud",
    logoPhoto: "Foto del Logo",
    coverPhoto: "Foto de Portada",
    otherPhotos: "Otras Fotos",
    appointmentURL: "URL de Citas",
    menuURL: "URL del Menú",
    reservationsURL: "URL de Reservaciones",
    orderAheadURL: "URL de Pedidos Anticipados",
    adwords: "Teléfono AdWords",
    goldmine: "Notas (Interno)",
    unstructuredData: "Datos No Estructurados",
    socialMedia: "Redes Sociales",
    openingHours: "Horario de Apertura",
    specialHours: "Horarios Especiales",
    moreHours: "Más Horarios",
    facebookUrl: "URL de Facebook",
    instagramUrl: "URL de Instagram",
    linkedinUrl: "URL de LinkedIn",
    pinterestUrl: "URL de Pinterest",
    tiktokUrl: "URL de TikTok",
    twitterUrl: "URL de Twitter/X",
    youtubeUrl: "URL de YouTube"
  },
  days: {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo"
  },
  validation: {
    required: "Este campo es obligatorio",
    storeCodeRequired: "El código de tienda es obligatorio",
    businessNameRequired: "El nombre del negocio es obligatorio",
    addressRequired: "La dirección es obligatoria",
    countryRequired: "El país es obligatorio",
    categoryRequired: "La categoría principal es obligatoria",
    invalidUrl: "Formato de URL inválido",
    invalidPhone: "Formato de número de teléfono inválido",
    invalidEmail: "Formato de correo electrónico inválido",
    passwordTooShort: "La contraseña debe tener al menos 8 caracteres",
    passwordsMustMatch: "Las contraseñas no coinciden",
    invalidDate: "Formato de fecha inválido",
    futureDate: "La fecha no puede ser en el futuro",
    maxLength: "Máximo {{max}} caracteres permitidos",
    invalidFormat: "Formato inválido"
  },
  placeholders: {
    briefDescription: "Breve descripción de tu negocio (máx. 750 caracteres)",
    labelsExample: "ej., Familiar, Orgánico, Wi-Fi Gratis (separados por coma)",
    additionalCategoriesMax: "Categorías adicionales separadas por coma (máx. 10)",
    selectCountry: "Seleccionar país",
    phonePlaceholder: "+34-555-123-4567",
    additionalPhonesPlaceholder: "Números de teléfono separados por coma",
    goldminePlaceholder: "Almacena datos no estructurados aquí (no incluido en exportaciones JSON)",
    goldmineDescription: "Este campo es para almacenar datos crudos/no estructurados y está excluido de todas las exportaciones JSON.",
    noCustomServices: "Aún no hay servicios personalizados asignados."
  }
};

// Turkish translations (bundled)
const turkishTranslations = {
  common: {
    nav: {
      yourLocations: "Lokasyonlarınız",
      accountSettings: "Hesap Ayarları",
      signOut: "Çıkış Yap",
      adminPanel: "Yönetim Paneli",
      backToOverview: "Genel Bakışa Dön"
    },
    actions: {
      add: "Ekle",
      import: "İçe Aktar",
      export: "Dışa Aktar",
      exportJson: "JSON Dışa Aktar",
      save: "Kaydet",
      cancel: "İptal",
      delete: "Sil",
      edit: "Düzenle",
      search: "Ara",
      filter: "Filtrele",
      refresh: "Yenile",
      close: "Kapat",
      closed: "Kapalı",
      confirm: "Onayla",
      submit: "Gönder",
      update: "Güncelle",
      updateCoordinates: "Koordinatları Güncelle",
      copyCoordinates: "Koordinatları Kopyala",
      openInBingMaps: "Bing Maps'te Aç",
      useCurrentLocation: "Mevcut Konumu Kullan",
      findFromAddress: "Adresten Bul",
      gettingLocation: "Konum Alınıyor...",
      geocoding: "Geocoding...",
      addSingleDate: "Tek Tarih Ekle",
      addDateRange: "Tarih Aralığı Ekle",
      manageCustomServices: "Özel Hizmetleri Yönet",
      addBusiness: "İşletme Ekle",
      addFirstBusiness: "İlk İşletmenizi Ekleyin",
      createUser: "Kullanıcı Oluştur",
      versionHistory: "Sürüm Geçmişi",
      settings: "Ayarlar",
      customServices: "Özel Hizmetler"
    },
    tabs: {
      activeLocations: "Aktif Lokasyonlar",
      needAttention: "İlgi Bekleyenler",
      new: "Yeni",
      clientOverview: "Müşteri Genel Bakış",
      allClients: "Tüm Müşteriler",
      users: "Kullanıcılar",
      translations: "Çeviriler"
    },
    settings: {
      title: "Hesap Ayarları",
      appearance: "Görünüm",
      security: "Güvenlik",
      language: "Dil",
      changePassword: "Şifre Değiştir",
      account: "Hesap",
      email: "E-posta",
      role: "Rol"
    },
    theme: {
      light: "Açık",
      dark: "Koyu",
      system: "Sistem"
    },
    status: {
      active: "Aktif",
      pending: "Beklemede",
      loading: "Yükleniyor...",
      noResults: "Sonuç bulunamadı",
      open: "Açık",
      total: "Toplam"
    },
    messages: {
      success: "Başarılı",
      error: "Hata",
      saved: "Değişiklikler başarıyla kaydedildi",
      deleted: "Başarıyla silindi",
      confirmDelete: "Bunu silmek istediğinizden emin misiniz?",
      noBusinessesFound: "Bu müşteri için işletme bulunamadı",
      createUserDescription: "Bu müşteri için Müşteri Yöneticisi, Kullanıcı veya Mağaza Sahibi oluşturun"
    },
    sections: {
      basicInformation: "Temel Bilgiler",
      addressInformation: "Adres Bilgileri",
      locationCoordinates: "Konum Koordinatları",
      contactInformation: "İletişim Bilgileri",
      socialMedia: "Sosyal Medya",
      businessDates: "İşletme Tarihleri",
      openingHours: "Çalışma Saatleri",
      specialHours: "Özel Saatler",
      coverPhoto: "Kapak Fotoğrafı",
      logoPhoto: "Logo Fotoğrafı",
      serviceUrls: "Hizmet URL'leri",
      customServices: "Özel Hizmetler",
      dataGoldmine: "Veri Deposu"
    },
    location: {
      currentCoordinates: "Mevcut Koordinatlar",
      useCurrentLocationHint: "Konumunuzu otomatik algılamak için \"Mevcut Konumu Kullan\" seçeneğini kullanın",
      findFromAddressHint: "Girdiğiniz adresi geocode etmek için \"Adresten Bul\" seçeneğini kullanın",
      manualEntryHint: "Kesin koordinatları manuel olarak da girebilirsiniz"
    },
    specialHours: {
      description: "Tatiller ve diğer istisnalar için özel saatler belirleyin. Bunlar normal çalışma saatlerini geçersiz kılar.",
      noHoursAdded: "Henüz özel saat eklenmedi",
      clickToStart: "Başlamak için \"Özel Saat Ekle\"ye tıklayın",
      date: "Tarih",
      hours: "Saat",
      pickDate: "Tarih seçin",
      selectDateRange: "Tarih Aralığı Seçin",
      hoursForAllDays: "Seçilen Tüm Günler İçin Saatler",
      applyToAllDates: "Tüm Tarihlere Uygula",
      daysSelected: "gün",
      selected: "Seçildi",
      generatedFormat: "Oluşturulan Format"
    },
    openingHours: {
      weekdays9to6: "Hafta içi 9-18",
      weekdays8to5: "Hafta içi 8-17",
      weekend10to2: "Hafta sonu 10-14",
      closeWeekends: "Hafta sonları kapalı",
      customFormat: "Özel Format (Gelişmiş)"
    },
    photos: {
      dragAndDrop: "Fotoğrafları buraya sürükleyip bırakın veya seçmek için tıklayın",
      dropHere: "Fotoğrafları buraya bırakın",
      photosUploaded: "fotoğraf yüklendi"
    },
    dialog: {
      editBusiness: "İşletmeyi Düzenle",
      addNewBusiness: "Yeni İşletme Ekle",
      updateBusinessInfo: "İşletme bilgilerini güncelle",
      enterBusinessDetails: "Yeni işletme lokasyonunuz için detayları girin",
      saving: "Kaydediliyor...",
      updateBusiness: "İşletmeyi Güncelle",
      createBusiness: "İşletme Oluştur"
    }
  },
  fields: {
    storeCode: "Mağaza Kodu",
    businessName: "İşletme Adı",
    addressLine1: "Sokak Adresi",
    addressLine2: "Adres Satırı 2",
    addressLine3: "Adres Satırı 3",
    addressLine4: "Adres Satırı 4",
    addressLine5: "Adres Satırı 5",
    country: "Ülke",
    city: "Şehir",
    state: "İl/Eyalet",
    postalCode: "Posta Kodu",
    district: "İlçe",
    primaryCategory: "Ana Kategori",
    additionalCategories: "Ek Kategoriler",
    website: "Web Sitesi",
    primaryPhone: "Ana Telefon",
    additionalPhones: "Ek Telefonlar",
    fromTheBusiness: "İşletme Hakkında",
    openingDate: "Açılış Tarihi",
    labels: "Etiketler",
    temporarilyClosed: "Geçici Olarak Kapalı",
    latitude: "Enlem",
    longitude: "Boylam",
    logoPhoto: "Logo Fotoğrafı",
    coverPhoto: "Kapak Fotoğrafı",
    otherPhotos: "Diğer Fotoğraflar",
    appointmentURL: "Randevu URL'si",
    menuURL: "Menü URL'si",
    reservationsURL: "Rezervasyon URL'si",
    orderAheadURL: "Ön Sipariş URL'si",
    adwords: "AdWords Telefon",
    goldmine: "Notlar (Dahili)",
    unstructuredData: "Yapılandırılmamış Veri",
    socialMedia: "Sosyal Medya",
    openingHours: "Çalışma Saatleri",
    specialHours: "Özel Saatler",
    moreHours: "Diğer Saatler",
    facebookUrl: "Facebook URL",
    instagramUrl: "Instagram URL",
    linkedinUrl: "LinkedIn URL",
    pinterestUrl: "Pinterest URL",
    tiktokUrl: "TikTok URL",
    twitterUrl: "Twitter/X URL",
    youtubeUrl: "YouTube URL"
  },
  days: {
    monday: "Pazartesi",
    tuesday: "Salı",
    wednesday: "Çarşamba",
    thursday: "Perşembe",
    friday: "Cuma",
    saturday: "Cumartesi",
    sunday: "Pazar"
  },
  validation: {
    required: "Bu alan zorunludur",
    storeCodeRequired: "Mağaza kodu gereklidir",
    businessNameRequired: "İşletme adı gereklidir",
    addressRequired: "Sokak adresi gereklidir",
    countryRequired: "Ülke gereklidir",
    categoryRequired: "Ana kategori gereklidir",
    invalidUrl: "Geçersiz URL formatı",
    invalidPhone: "Geçersiz telefon numarası formatı",
    invalidEmail: "Geçersiz e-posta formatı",
    passwordTooShort: "Şifre en az 8 karakter olmalıdır",
    passwordsMustMatch: "Şifreler eşleşmiyor",
    invalidDate: "Geçersiz tarih formatı",
    futureDate: "Tarih gelecekte olamaz",
    maxLength: "En fazla {{max}} karakter izin verilir",
    invalidFormat: "Geçersiz format"
  },
  placeholders: {
    briefDescription: "İşletmenizin kısa açıklaması (maks. 750 karakter)",
    labelsExample: "örn., Aile dostu, Organik, Ücretsiz Wi-Fi (virgülle ayrılmış)",
    additionalCategoriesMax: "Virgülle ayrılmış ek kategoriler (maks. 10)",
    selectCountry: "Ülke seçin",
    phonePlaceholder: "+90-555-123-4567",
    additionalPhonesPlaceholder: "Virgülle ayrılmış telefon numaraları",
    goldminePlaceholder: "Yapılandırılmamış verileri buraya kaydedin (JSON dışa aktarımlarına dahil değil)",
    goldmineDescription: "Bu alan ham/yapılandırılmamış verileri depolamak içindir ve tüm JSON dışa aktarımlarından hariç tutulur.",
    noCustomServices: "Henüz özel hizmet atanmadı."
  }
};

// Italian translations (bundled)
const italianTranslations = {
  common: {
    nav: {
      yourLocations: "Le Tue Sedi",
      accountSettings: "Impostazioni Account",
      signOut: "Esci",
      adminPanel: "Pannello di Amministrazione",
      backToOverview: "Torna alla Panoramica"
    },
    actions: {
      add: "Aggiungi",
      import: "Importa",
      export: "Esporta",
      exportJson: "Esporta JSON",
      save: "Salva",
      cancel: "Annulla",
      delete: "Elimina",
      edit: "Modifica",
      search: "Cerca",
      filter: "Filtra",
      refresh: "Aggiorna",
      close: "Chiudi",
      closed: "Chiuso",
      confirm: "Conferma",
      submit: "Invia",
      update: "Aggiorna",
      updateCoordinates: "Aggiorna Coordinate",
      copyCoordinates: "Copia Coordinate",
      openInBingMaps: "Apri in Bing Maps",
      useCurrentLocation: "Usa Posizione Attuale",
      findFromAddress: "Trova da Indirizzo",
      gettingLocation: "Rilevamento Posizione...",
      geocoding: "Geocodifica...",
      addSingleDate: "Aggiungi Data Singola",
      addDateRange: "Aggiungi Intervallo Date",
      manageCustomServices: "Gestisci Servizi Personalizzati",
      addBusiness: "Aggiungi Attività",
      addFirstBusiness: "Aggiungi la Tua Prima Attività",
      createUser: "Crea Utente",
      versionHistory: "Cronologia Versioni",
      settings: "Impostazioni",
      customServices: "Servizi Personalizzati"
    },
    tabs: {
      activeLocations: "Sedi Attive",
      needAttention: "Richiedono Attenzione",
      new: "Nuovo",
      clientOverview: "Panoramica Clienti",
      allClients: "Tutti i Clienti",
      users: "Utenti",
      translations: "Traduzioni"
    },
    settings: {
      title: "Impostazioni Account",
      appearance: "Aspetto",
      security: "Sicurezza",
      language: "Lingua",
      changePassword: "Cambia Password",
      account: "Account",
      email: "Email",
      role: "Ruolo"
    },
    theme: {
      light: "Chiaro",
      dark: "Scuro",
      system: "Sistema"
    },
    status: {
      active: "Attivo",
      pending: "In Attesa",
      loading: "Caricamento...",
      noResults: "Nessun risultato trovato",
      open: "Aperto",
      total: "Totale"
    },
    messages: {
      success: "Successo",
      error: "Errore",
      saved: "Modifiche salvate con successo",
      deleted: "Eliminato con successo",
      confirmDelete: "Sei sicuro di voler eliminare questo elemento?",
      noBusinessesFound: "Nessuna attività trovata per questo cliente",
      createUserDescription: "Crea Amministratori Cliente, Utenti o Proprietari di Negozio per questo cliente"
    },
    sections: {
      basicInformation: "Informazioni di Base",
      addressInformation: "Informazioni Indirizzo",
      locationCoordinates: "Coordinate della Posizione",
      contactInformation: "Informazioni di Contatto",
      socialMedia: "Social Media",
      businessDates: "Date dell'Attività",
      openingHours: "Orari di Apertura",
      specialHours: "Orari Speciali",
      coverPhoto: "Foto di Copertina",
      logoPhoto: "Foto del Logo",
      serviceUrls: "URL dei Servizi",
      customServices: "Servizi Personalizzati",
      dataGoldmine: "Deposito Dati"
    },
    location: {
      currentCoordinates: "Coordinate Attuali",
      useCurrentLocationHint: "Usa \"Posizione Attuale\" per rilevare automaticamente la tua posizione",
      findFromAddressHint: "Usa \"Trova da Indirizzo\" per geocodificare l'indirizzo inserito",
      manualEntryHint: "Puoi anche inserire manualmente le coordinate precise"
    },
    specialHours: {
      description: "Imposta orari speciali per festività e altre eccezioni. Questi sostituiscono gli orari di apertura regolari.",
      noHoursAdded: "Nessun orario speciale ancora aggiunto",
      clickToStart: "Clicca su \"Aggiungi Orari Speciali\" per iniziare",
      date: "Data",
      hours: "Ore",
      pickDate: "Seleziona una data",
      selectDateRange: "Seleziona Intervallo Date",
      hoursForAllDays: "Orari per Tutti i Giorni Selezionati",
      applyToAllDates: "Applica a Tutte le Date",
      daysSelected: "giorni",
      selected: "Selezionato",
      generatedFormat: "Formato Generato"
    },
    openingHours: {
      weekdays9to6: "Giorni feriali 9-18",
      weekdays8to5: "Giorni feriali 8-17",
      weekend10to2: "Fine settimana 10-14",
      closeWeekends: "Chiuso nei fine settimana",
      customFormat: "Formato Personalizzato (Avanzato)"
    },
    photos: {
      dragAndDrop: "Trascina e rilascia le foto qui, o clicca per selezionare",
      dropHere: "Rilascia le foto qui",
      photosUploaded: "foto caricate"
    },
    dialog: {
      editBusiness: "Modifica Attività",
      addNewBusiness: "Aggiungi Nuova Attività",
      updateBusinessInfo: "Aggiorna le informazioni dell'attività",
      enterBusinessDetails: "Inserisci i dettagli per la tua nuova sede",
      saving: "Salvataggio...",
      updateBusiness: "Aggiorna Attività",
      createBusiness: "Crea Attività"
    }
  },
  fields: {
    storeCode: "Codice Negozio",
    businessName: "Nome Attività",
    addressLine1: "Indirizzo",
    addressLine2: "Riga Indirizzo 2",
    addressLine3: "Riga Indirizzo 3",
    addressLine4: "Riga Indirizzo 4",
    addressLine5: "Riga Indirizzo 5",
    country: "Paese",
    city: "Città",
    state: "Stato/Provincia",
    postalCode: "Codice Postale",
    district: "Distretto",
    primaryCategory: "Categoria Principale",
    additionalCategories: "Categorie Aggiuntive",
    website: "Sito Web",
    primaryPhone: "Telefono Principale",
    additionalPhones: "Telefoni Aggiuntivi",
    fromTheBusiness: "Dall'Attività",
    openingDate: "Data di Apertura",
    labels: "Etichette",
    temporarilyClosed: "Temporaneamente Chiuso",
    latitude: "Latitudine",
    longitude: "Longitudine",
    logoPhoto: "Foto del Logo",
    coverPhoto: "Foto di Copertina",
    otherPhotos: "Altre Foto",
    appointmentURL: "URL Appuntamenti",
    menuURL: "URL Menu",
    reservationsURL: "URL Prenotazioni",
    orderAheadURL: "URL Ordini Anticipati",
    adwords: "Telefono AdWords",
    goldmine: "Note (Interno)",
    unstructuredData: "Dati Non Strutturati",
    socialMedia: "Social Media",
    openingHours: "Orari di Apertura",
    specialHours: "Orari Speciali",
    moreHours: "Altri Orari",
    facebookUrl: "URL Facebook",
    instagramUrl: "URL Instagram",
    linkedinUrl: "URL LinkedIn",
    pinterestUrl: "URL Pinterest",
    tiktokUrl: "URL TikTok",
    twitterUrl: "URL Twitter/X",
    youtubeUrl: "URL YouTube"
  },
  days: {
    monday: "Lunedì",
    tuesday: "Martedì",
    wednesday: "Mercoledì",
    thursday: "Giovedì",
    friday: "Venerdì",
    saturday: "Sabato",
    sunday: "Domenica"
  },
  validation: {
    required: "Questo campo è obbligatorio",
    storeCodeRequired: "Il codice negozio è obbligatorio",
    businessNameRequired: "Il nome dell'attività è obbligatorio",
    addressRequired: "L'indirizzo è obbligatorio",
    countryRequired: "Il paese è obbligatorio",
    categoryRequired: "La categoria principale è obbligatoria",
    invalidUrl: "Formato URL non valido",
    invalidPhone: "Formato numero di telefono non valido",
    invalidEmail: "Formato email non valido",
    passwordTooShort: "La password deve contenere almeno 8 caratteri",
    passwordsMustMatch: "Le password non corrispondono",
    invalidDate: "Formato data non valido",
    futureDate: "La data non può essere nel futuro",
    maxLength: "Massimo {{max}} caratteri consentiti",
    invalidFormat: "Formato non valido"
  },
  placeholders: {
    briefDescription: "Breve descrizione della tua attività (max. 750 caratteri)",
    labelsExample: "es., Adatto alle famiglie, Biologico, Wi-Fi Gratuito (separati da virgola)",
    additionalCategoriesMax: "Categorie aggiuntive separate da virgola (max. 10)",
    selectCountry: "Seleziona paese",
    phonePlaceholder: "+39-02-1234567",
    additionalPhonesPlaceholder: "Numeri di telefono separati da virgola",
    goldminePlaceholder: "Archivia dati non strutturati qui (non inclusi nelle esportazioni JSON)",
    goldmineDescription: "Questo campo serve per archiviare dati grezzi/non strutturati ed è escluso da tutte le esportazioni JSON.",
    noCustomServices: "Nessun servizio personalizzato ancora assegnato."
  }
};

// Serbian translations (bundled)
const serbianTranslations = {
  common: {
    nav: {
      yourLocations: "Ваше Локације",
      accountSettings: "Подешавања Налога",
      signOut: "Одјави се",
      adminPanel: "Администраторски Панел",
      backToOverview: "Назад на Преглед"
    },
    actions: {
      add: "Додај",
      import: "Увези",
      export: "Извези",
      exportJson: "Извези JSON",
      save: "Сачувај",
      cancel: "Откажи",
      delete: "Обриши",
      edit: "Измени",
      search: "Претражи",
      filter: "Филтрирај",
      refresh: "Освежи",
      close: "Затвори",
      closed: "Затворено",
      confirm: "Потврди",
      submit: "Пошаљи",
      update: "Ажурирај",
      updateCoordinates: "Ажурирај Координате",
      copyCoordinates: "Копирај Координате",
      openInBingMaps: "Отвори у Bing Maps",
      useCurrentLocation: "Користи Тренутну Локацију",
      findFromAddress: "Пронађи од Адресе",
      gettingLocation: "Добијање Локације...",
      geocoding: "Геокодирање...",
      addSingleDate: "Додај Појединачни Датум",
      addDateRange: "Додај Опсег Датума",
      manageCustomServices: "Управљај Прилагођеним Услугама",
      addBusiness: "Додај Пословање",
      addFirstBusiness: "Додај Своје Прво Пословање",
      createUser: "Креирај Корисника",
      versionHistory: "Историја Верзија",
      settings: "Подешавања",
      customServices: "Прилагођене Услуге"
    },
    tabs: {
      activeLocations: "Активне Локације",
      needAttention: "Захтевају Пажњу",
      new: "Ново",
      clientOverview: "Преглед Клијената",
      allClients: "Сви Клијенти",
      users: "Корисници",
      translations: "Преводи"
    },
    settings: {
      title: "Подешавања Налога",
      appearance: "Изглед",
      security: "Безбедност",
      language: "Језик",
      changePassword: "Промени Лозинку",
      account: "Налог",
      email: "Е-пошта",
      role: "Улога"
    },
    theme: {
      light: "Светла",
      dark: "Тамна",
      system: "Систем"
    },
    status: {
      active: "Активно",
      pending: "На Чекању",
      loading: "Учитавање...",
      noResults: "Нема пронађених резултата",
      open: "Отворено",
      total: "Укупно"
    },
    messages: {
      success: "Успех",
      error: "Грешка",
      saved: "Измене су успешно сачуване",
      deleted: "Успешно обрисано",
      confirmDelete: "Да ли сте сигурни да желите да обришете ово?",
      noBusinessesFound: "Није пронађено пословање за овог клијента",
      createUserDescription: "Креирајте Администраторе Клијената, Кориснике или Власнике Продавница за овог клијента"
    },
    sections: {
      basicInformation: "Основне Информације",
      addressInformation: "Информације о Адреси",
      locationCoordinates: "Координате Локације",
      contactInformation: "Контакт Информације",
      socialMedia: "Друштвене Мреже",
      businessDates: "Датуми Пословања",
      openingHours: "Радно Време",
      specialHours: "Посебно Радно Време",
      coverPhoto: "Насловна Фотографија",
      logoPhoto: "Фотографија Логоа",
      serviceUrls: "URL Адресе Услуга",
      customServices: "Прилагођене Услуге",
      dataGoldmine: "Складиште Података"
    },
    location: {
      currentCoordinates: "Тренутне Координате",
      useCurrentLocationHint: "Користите \"Тренутну Локацију\" за аутоматско откривање ваше позиције",
      findFromAddressHint: "Користите \"Пронађи од Адресе\" за геокодирање унете адресе",
      manualEntryHint: "Такође можете ручно унети прецизне координате"
    },
    specialHours: {
      description: "Поставите посебно радно време за празнике и друге изузетке. Ово замењује редовно радно време.",
      noHoursAdded: "Још није додато посебно радно време",
      clickToStart: "Кликните на \"Додај Посебно Радно Време\" за почетак",
      date: "Датум",
      hours: "Сати",
      pickDate: "Изаберите датум",
      selectDateRange: "Изаберите Опсег Датума",
      hoursForAllDays: "Радно Време за Све Изабране Дане",
      applyToAllDates: "Примени на Све Датуме",
      daysSelected: "дана",
      selected: "Изабрано",
      generatedFormat: "Генерисани Формат"
    },
    openingHours: {
      weekdays9to6: "Радни дани 9-18",
      weekdays8to5: "Радни дани 8-17",
      weekend10to2: "Викенд 10-14",
      closeWeekends: "Затворено викендом",
      customFormat: "Прилагођени Формат (Напредно)"
    },
    photos: {
      dragAndDrop: "Превуците и отпустите фотографије овде, или кликните за одабир",
      dropHere: "Отпустите фотографије овде",
      photosUploaded: "фотографија отпремљено"
    },
    dialog: {
      editBusiness: "Измени Пословање",
      addNewBusiness: "Додај Ново Пословање",
      updateBusinessInfo: "Ажурирај информације о пословању",
      enterBusinessDetails: "Унесите детаље за вашу нову локацију пословања",
      saving: "Чување...",
      updateBusiness: "Ажурирај Пословање",
      createBusiness: "Креирај Пословање"
    }
  },
  fields: {
    storeCode: "Код Продавнице",
    businessName: "Назив Пословања",
    addressLine1: "Адреса",
    addressLine2: "Ред Адресе 2",
    addressLine3: "Ред Адресе 3",
    addressLine4: "Ред Адресе 4",
    addressLine5: "Ред Адресе 5",
    country: "Земља",
    city: "Град",
    state: "Држава/Покрајина",
    postalCode: "Поштански Број",
    district: "Округ",
    primaryCategory: "Примарна Категорија",
    additionalCategories: "Додатне Категорије",
    website: "Веб Сајт",
    primaryPhone: "Примарни Телефон",
    additionalPhones: "Додатни Телефони",
    fromTheBusiness: "О Пословању",
    openingDate: "Датум Отварања",
    labels: "Ознаке",
    temporarilyClosed: "Привремено Затворено",
    latitude: "Географска Ширина",
    longitude: "Географска Дужина",
    logoPhoto: "Фотографија Логоа",
    coverPhoto: "Насловна Фотографија",
    otherPhotos: "Остале Фотографије",
    appointmentURL: "URL за Заказивање",
    menuURL: "URL Менија",
    reservationsURL: "URL Резервација",
    orderAheadURL: "URL за Претходну Наруџбу",
    adwords: "AdWords Телефон",
    goldmine: "Белешке (Интерно)",
    unstructuredData: "Неструктурирани Подаци",
    socialMedia: "Друштвене Мреже",
    openingHours: "Радно Време",
    specialHours: "Посебно Радно Време",
    moreHours: "Више Радног Времена",
    facebookUrl: "Facebook URL",
    instagramUrl: "Instagram URL",
    linkedinUrl: "LinkedIn URL",
    pinterestUrl: "Pinterest URL",
    tiktokUrl: "TikTok URL",
    twitterUrl: "Twitter/X URL",
    youtubeUrl: "YouTube URL"
  },
  days: {
    monday: "Понедељак",
    tuesday: "Уторак",
    wednesday: "Среда",
    thursday: "Четвртак",
    friday: "Петак",
    saturday: "Субота",
    sunday: "Недеља"
  },
  validation: {
    required: "Ово поље је обавезно",
    storeCodeRequired: "Код продавнице је обавезан",
    businessNameRequired: "Назив пословања је обавезан",
    addressRequired: "Адреса је обавезна",
    countryRequired: "Земља је обавезна",
    categoryRequired: "Примарна категорија је обавезна",
    invalidUrl: "Неважећи формат URL-а",
    invalidPhone: "Неважећи формат телефонског броја",
    invalidEmail: "Неважећи формат е-поште",
    passwordTooShort: "Лозинка мора имати најмање 8 карактера",
    passwordsMustMatch: "Лозинке се не подударају",
    invalidDate: "Неважећи формат датума",
    futureDate: "Датум не може бити у будућности",
    maxLength: "Максимално {{max}} карактера дозвољено",
    invalidFormat: "Неважећи формат"
  },
  placeholders: {
    briefDescription: "Кратак опис вашег пословања (макс. 750 карактера)",
    labelsExample: "нпр., Породично пријатељски, Органски, Бесплатан Wi-Fi (одвојено зарезом)",
    additionalCategoriesMax: "Додатне категорије одвојене зарезом (макс. 10)",
    selectCountry: "Изаберите земљу",
    phonePlaceholder: "+381-11-123-4567",
    additionalPhonesPlaceholder: "Телефонски бројеви одвојени зарезом",
    goldminePlaceholder: "Сачувајте неструктуриране податке овде (није укључено у JSON извоз)",
    goldmineDescription: "Ово поље служи за складиштење сирових/неструктурираних података и искључено је из свих JSON извоза.",
    noCustomServices: "Још нема додељених прилагођених услуга."
  }
};

// Romanian translations (bundled)
const romanianTranslations = {
  common: {
    nav: {
      yourLocations: "Locațiile Tale",
      accountSettings: "Setări Cont",
      signOut: "Deconectare",
      adminPanel: "Panou de Administrare",
      backToOverview: "Înapoi la Prezentare"
    },
    actions: {
      add: "Adaugă",
      import: "Importă",
      export: "Exportă",
      exportJson: "Exportă JSON",
      save: "Salvează",
      cancel: "Anulează",
      delete: "Șterge",
      edit: "Editează",
      search: "Caută",
      filter: "Filtrează",
      refresh: "Reîmprospătează",
      close: "Închide",
      closed: "Închis",
      confirm: "Confirmă",
      submit: "Trimite",
      update: "Actualizează",
      updateCoordinates: "Actualizează Coordonatele",
      copyCoordinates: "Copiază Coordonatele",
      openInBingMaps: "Deschide în Bing Maps",
      useCurrentLocation: "Folosește Locația Curentă",
      findFromAddress: "Găsește din Adresă",
      gettingLocation: "Se obține Locația...",
      geocoding: "Geocodificare...",
      addSingleDate: "Adaugă Dată Unică",
      addDateRange: "Adaugă Interval de Date",
      manageCustomServices: "Gestionează Servicii Personalizate",
      addBusiness: "Adaugă Afacere",
      addFirstBusiness: "Adaugă Prima Ta Afacere",
      createUser: "Creează Utilizator",
      versionHistory: "Istoric Versiuni",
      settings: "Setări",
      customServices: "Servicii Personalizate"
    },
    tabs: {
      activeLocations: "Locații Active",
      needAttention: "Necesită Atenție",
      new: "Nou",
      clientOverview: "Prezentare Clienți",
      allClients: "Toți Clienții",
      users: "Utilizatori",
      translations: "Traduceri"
    },
    settings: {
      title: "Setări Cont",
      appearance: "Aspect",
      security: "Securitate",
      language: "Limbă",
      changePassword: "Schimbă Parola",
      account: "Cont",
      email: "Email",
      role: "Rol"
    },
    theme: {
      light: "Luminos",
      dark: "Întunecat",
      system: "Sistem"
    },
    status: {
      active: "Activ",
      pending: "În Așteptare",
      loading: "Se încarcă...",
      noResults: "Nu s-au găsit rezultate",
      open: "Deschis",
      total: "Total"
    },
    messages: {
      success: "Succes",
      error: "Eroare",
      saved: "Modificările au fost salvate cu succes",
      deleted: "Șters cu succes",
      confirmDelete: "Ești sigur că vrei să ștergi acest element?",
      noBusinessesFound: "Nu s-au găsit afaceri pentru acest client",
      createUserDescription: "Creează Administratori de Client, Utilizatori sau Proprietari de Magazine pentru acest client"
    },
    sections: {
      basicInformation: "Informații de Bază",
      addressInformation: "Informații despre Adresă",
      locationCoordinates: "Coordonatele Locației",
      contactInformation: "Informații de Contact",
      socialMedia: "Rețele Sociale",
      businessDates: "Datele Afacerii",
      openingHours: "Program de Funcționare",
      specialHours: "Program Special",
      coverPhoto: "Fotografie de Copertă",
      logoPhoto: "Fotografie Logo",
      serviceUrls: "URL-uri Servicii",
      customServices: "Servicii Personalizate",
      dataGoldmine: "Depozit de Date"
    },
    location: {
      currentCoordinates: "Coordonate Curente",
      useCurrentLocationHint: "Folosește \"Locația Curentă\" pentru a detecta automat poziția ta",
      findFromAddressHint: "Folosește \"Găsește din Adresă\" pentru a geocodifica adresa introdusă",
      manualEntryHint: "Poți introduce manual și coordonate precise"
    },
    specialHours: {
      description: "Setează program special pentru sărbători și alte excepții. Acestea înlocuiesc programul obișnuit.",
      noHoursAdded: "Nu s-a adăugat încă program special",
      clickToStart: "Apasă pe \"Adaugă Program Special\" pentru a începe",
      date: "Dată",
      hours: "Ore",
      pickDate: "Alege o dată",
      selectDateRange: "Selectează Interval de Date",
      hoursForAllDays: "Program pentru Toate Zilele Selectate",
      applyToAllDates: "Aplică la Toate Datele",
      daysSelected: "zile",
      selected: "Selectat",
      generatedFormat: "Format Generat"
    },
    openingHours: {
      weekdays9to6: "Zile lucrătoare 9-18",
      weekdays8to5: "Zile lucrătoare 8-17",
      weekend10to2: "Weekend 10-14",
      closeWeekends: "Închis în weekend",
      customFormat: "Format Personalizat (Avansat)"
    },
    photos: {
      dragAndDrop: "Trage și plasează fotografii aici, sau apasă pentru a selecta",
      dropHere: "Plasează fotografiile aici",
      photosUploaded: "fotografii încărcate"
    },
    dialog: {
      editBusiness: "Editează Afacerea",
      addNewBusiness: "Adaugă Afacere Nouă",
      updateBusinessInfo: "Actualizează informațiile afacerii",
      enterBusinessDetails: "Introdu detaliile pentru noua ta locație",
      saving: "Se salvează...",
      updateBusiness: "Actualizează Afacerea",
      createBusiness: "Creează Afacerea"
    }
  },
  fields: {
    storeCode: "Cod Magazin",
    businessName: "Numele Afacerii",
    addressLine1: "Adresă",
    addressLine2: "Linie Adresă 2",
    addressLine3: "Linie Adresă 3",
    addressLine4: "Linie Adresă 4",
    addressLine5: "Linie Adresă 5",
    country: "Țară",
    city: "Oraș",
    state: "Stat/Provincie",
    postalCode: "Cod Poștal",
    district: "District",
    primaryCategory: "Categorie Principală",
    additionalCategories: "Categorii Suplimentare",
    website: "Site Web",
    primaryPhone: "Telefon Principal",
    additionalPhones: "Telefoane Suplimentare",
    fromTheBusiness: "Despre Afacere",
    openingDate: "Data Deschiderii",
    labels: "Etichete",
    temporarilyClosed: "Închis Temporar",
    latitude: "Latitudine",
    longitude: "Longitudine",
    logoPhoto: "Fotografie Logo",
    coverPhoto: "Fotografie de Copertă",
    otherPhotos: "Alte Fotografii",
    appointmentURL: "URL Programări",
    menuURL: "URL Meniu",
    reservationsURL: "URL Rezervări",
    orderAheadURL: "URL Comenzi Anticipate",
    adwords: "Telefon AdWords",
    goldmine: "Note (Intern)",
    unstructuredData: "Date Nestructurate",
    socialMedia: "Rețele Sociale",
    openingHours: "Program de Funcționare",
    specialHours: "Program Special",
    moreHours: "Mai Multe Ore",
    facebookUrl: "URL Facebook",
    instagramUrl: "URL Instagram",
    linkedinUrl: "URL LinkedIn",
    pinterestUrl: "URL Pinterest",
    tiktokUrl: "URL TikTok",
    twitterUrl: "URL Twitter/X",
    youtubeUrl: "URL YouTube"
  },
  days: {
    monday: "Luni",
    tuesday: "Marți",
    wednesday: "Miercuri",
    thursday: "Joi",
    friday: "Vineri",
    saturday: "Sâmbătă",
    sunday: "Duminică"
  },
  validation: {
    required: "Acest câmp este obligatoriu",
    storeCodeRequired: "Codul magazinului este obligatoriu",
    businessNameRequired: "Numele afacerii este obligatoriu",
    addressRequired: "Adresa este obligatorie",
    countryRequired: "Țara este obligatorie",
    categoryRequired: "Categoria principală este obligatorie",
    invalidUrl: "Format URL invalid",
    invalidPhone: "Format număr de telefon invalid",
    invalidEmail: "Format email invalid",
    passwordTooShort: "Parola trebuie să aibă cel puțin 8 caractere",
    passwordsMustMatch: "Parolele nu se potrivesc",
    invalidDate: "Format dată invalid",
    futureDate: "Data nu poate fi în viitor",
    maxLength: "Maximum {{max}} caractere permise",
    invalidFormat: "Format invalid"
  },
  placeholders: {
    briefDescription: "Descriere scurtă a afacerii tale (max. 750 caractere)",
    labelsExample: "ex., Familie, Organic, Wi-Fi Gratuit (separate prin virgulă)",
    additionalCategoriesMax: "Categorii suplimentare separate prin virgulă (max. 10)",
    selectCountry: "Selectează țara",
    phonePlaceholder: "+40-21-123-4567",
    additionalPhonesPlaceholder: "Numere de telefon separate prin virgulă",
    goldminePlaceholder: "Stochează date nestructurate aici (nu sunt incluse în exporturile JSON)",
    goldmineDescription: "Acest câmp este pentru stocarea datelor brute/nestructurate și este exclus din toate exporturile JSON.",
    noCustomServices: "Nu sunt încă servicii personalizate atribuite."
  }
};

// Default languages that are always available
export const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', isDefault: true },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export interface Language {
  code: string;
  name: string;
  flag: string;
  isDefault?: boolean;
  isCustom?: boolean;
}

// Get custom languages from localStorage
export const getCustomLanguages = (): Language[] => {
  try {
    const stored = localStorage.getItem('custom_languages');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Add a new custom language
export const addCustomLanguage = (code: string, name: string, flag: string) => {
  const custom = getCustomLanguages();
  
  // Check if language already exists
  const allLangs = getAllLanguages();
  if (allLangs.some(l => l.code === code)) {
    throw new Error(`Language with code "${code}" already exists`);
  }
  
  const newLang: Language = { code, name, flag, isCustom: true };
  custom.push(newLang);
  localStorage.setItem('custom_languages', JSON.stringify(custom));
  
  // Initialize empty resources for this language (will fallback to English)
  i18n.addResourceBundle(code, 'common', {}, true, true);
  i18n.addResourceBundle(code, 'fields', {}, true, true);
  i18n.addResourceBundle(code, 'days', {}, true, true);
  i18n.addResourceBundle(code, 'validation', {}, true, true);
  i18n.addResourceBundle(code, 'placeholders', {}, true, true);
  
  return newLang;
};

// Remove a custom language
export const removeCustomLanguage = (code: string) => {
  const custom = getCustomLanguages();
  const filtered = custom.filter(l => l.code !== code);
  localStorage.setItem('custom_languages', JSON.stringify(filtered));
  
  // Also remove stored translations for this language
  localStorage.removeItem(`translations_${code}`);
};

// Get all languages (default + custom)
export const getAllLanguages = (): Language[] => {
  return [...DEFAULT_LANGUAGES, ...getCustomLanguages()];
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

// Get bundled translations for a language
const getBundledTranslations = (lang: string) => {
  if (lang === 'tr') return turkishTranslations;
  if (lang === 'es') return spanishTranslations;
  if (lang === 'fr') return frenchTranslations;
  if (lang === 'it') return italianTranslations;
  if (lang === 'sr') return serbianTranslations;
  if (lang === 'ro') return romanianTranslations;
  return resources[lang as keyof typeof resources] || resources.en;
};

// Get all translations for a language (merged default + custom)
export const getAllTranslations = (lang: string) => {
  const defaults = getBundledTranslations(lang);
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

// Initialize i18n with all bundled languages
const allResources = {
  ...resources,
  tr: turkishTranslations,
  es: spanishTranslations,
  fr: frenchTranslations,
  it: italianTranslations,
  sr: serbianTranslations,
  ro: romanianTranslations
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: allResources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'fields', 'days', 'validation', 'placeholders'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Load custom languages and their translations
const loadCustomLanguages = () => {
  const customLanguages = getCustomLanguages();
  customLanguages.forEach(lang => {
    // Initialize empty resources for custom languages
    i18n.addResourceBundle(lang.code, 'common', {}, true, true);
    i18n.addResourceBundle(lang.code, 'fields', {}, true, true);
    i18n.addResourceBundle(lang.code, 'days', {}, true, true);
    i18n.addResourceBundle(lang.code, 'validation', {}, true, true);
    i18n.addResourceBundle(lang.code, 'placeholders', {}, true, true);
  });
};

// Load any custom translations from localStorage
const languages = getAllLanguages().map(l => l.code);
loadCustomLanguages();

languages.forEach(lang => {
  const custom = getStoredTranslations(lang);
  if (custom) {
    Object.keys(custom).forEach(namespace => {
      i18n.addResourceBundle(lang, namespace, custom[namespace], true, true);
    });
  }
});

export default i18n;
