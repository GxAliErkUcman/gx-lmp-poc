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
  es: spanishTranslations
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
