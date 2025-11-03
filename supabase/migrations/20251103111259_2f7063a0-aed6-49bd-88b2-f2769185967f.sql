-- Create field_group enum
CREATE TYPE public.field_group AS ENUM (
  'basic_info',
  'address_details',
  'location',
  'categories',
  'contact',
  'marketing',
  'opening_hours',
  'dates',
  'status',
  'photos',
  'service_urls',
  'additional_features',
  'import_function'
);

-- Create lockable_fields reference table
CREATE TABLE public.lockable_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  field_group public.field_group NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unified client_permissions table
CREATE TABLE public.client_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.lockable_fields(id) ON DELETE CASCADE,
  locked_for_user BOOLEAN NOT NULL DEFAULT false,
  locked_for_store_owner BOOLEAN NOT NULL DEFAULT false,
  locked_for_client_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, field_id)
);

-- Enable RLS
ALTER TABLE public.lockable_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;

-- RLS for lockable_fields (read-only reference data)
CREATE POLICY "Everyone can view lockable fields"
ON public.lockable_fields FOR SELECT
USING (true);

-- RLS for client_permissions
CREATE POLICY "Admins can manage all permissions"
ON public.client_permissions FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client admins can view their client permissions"
ON public.client_permissions FOR SELECT
USING (
  public.has_role(auth.uid(), 'client_admin'::app_role)
  AND client_id = public.get_user_client_id()
);

CREATE POLICY "Client admins can update user and store owner locks"
ON public.client_permissions FOR UPDATE
USING (
  public.has_role(auth.uid(), 'client_admin'::app_role)
  AND client_id = public.get_user_client_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'client_admin'::app_role)
  AND client_id = public.get_user_client_id()
);

CREATE POLICY "Client admins can insert permissions for their client"
ON public.client_permissions FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'client_admin'::app_role)
  AND client_id = public.get_user_client_id()
);

CREATE POLICY "Service users can view permissions for assigned clients"
ON public.client_permissions FOR SELECT
USING (
  public.has_role(auth.uid(), 'service_user'::app_role)
  AND client_id IN (
    SELECT client_id FROM public.get_user_accessible_clients(auth.uid())
  )
);

CREATE POLICY "Users and store owners can view their client permissions"
ON public.client_permissions FOR SELECT
USING (
  (public.has_role(auth.uid(), 'user'::app_role) OR public.has_role(auth.uid(), 'store_owner'::app_role))
  AND client_id = public.get_user_client_id()
);

-- Add trigger for updated_at
CREATE TRIGGER update_client_permissions_updated_at
BEFORE UPDATE ON public.client_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed lockable_fields table
INSERT INTO public.lockable_fields (field_name, display_name, field_group, sort_order) VALUES
-- Basic Info
('storeCode', 'Store Code', 'basic_info', 1),
('businessName', 'Business Name', 'basic_info', 2),
('status', 'Status', 'basic_info', 3),

-- Address Details
('addressLine1', 'Address Line 1', 'address_details', 10),
('addressLine2', 'Address Line 2', 'address_details', 11),
('addressLine3', 'Address Line 3', 'address_details', 12),
('addressLine4', 'Address Line 4', 'address_details', 13),
('addressLine5', 'Address Line 5', 'address_details', 14),
('postalCode', 'Postal Code', 'address_details', 15),
('district', 'District', 'address_details', 16),
('city', 'City', 'address_details', 17),
('state', 'State', 'address_details', 18),
('country', 'Country', 'address_details', 19),

-- Location
('latitude', 'Latitude', 'location', 20),
('longitude', 'Longitude', 'location', 21),

-- Categories
('primaryCategory', 'Primary Category', 'categories', 30),
('additionalCategories', 'Additional Categories', 'categories', 31),

-- Contact
('website', 'Website', 'contact', 40),
('primaryPhone', 'Primary Phone', 'contact', 41),
('additionalPhones', 'Additional Phones', 'contact', 42),

-- Marketing
('adwords', 'AdWords Location Extension', 'marketing', 50),
('labels', 'Labels', 'marketing', 51),
('fromTheBusiness', 'From The Business', 'marketing', 52),

-- Opening Hours
('mondayHours', 'Monday Hours', 'opening_hours', 60),
('tuesdayHours', 'Tuesday Hours', 'opening_hours', 61),
('wednesdayHours', 'Wednesday Hours', 'opening_hours', 62),
('thursdayHours', 'Thursday Hours', 'opening_hours', 63),
('fridayHours', 'Friday Hours', 'opening_hours', 64),
('saturdayHours', 'Saturday Hours', 'opening_hours', 65),
('sundayHours', 'Sunday Hours', 'opening_hours', 66),
('specialHours', 'Special Hours', 'opening_hours', 67),
('moreHours', 'More Hours', 'opening_hours', 68),

-- Dates
('openingDate', 'Opening Date', 'dates', 70),

-- Status
('temporarilyClosed', 'Temporarily Closed', 'status', 80),

-- Photos
('logoPhoto', 'Logo Photo', 'photos', 90),
('coverPhoto', 'Cover Photo', 'photos', 91),
('otherPhotos', 'Other Photos', 'photos', 92),

-- Service URLs
('appointmentURL', 'Appointment URL', 'service_urls', 100),
('menuURL', 'Menu URL', 'service_urls', 101),
('reservationsURL', 'Reservations URL', 'service_urls', 102),
('orderAheadURL', 'Order Ahead URL', 'service_urls', 103),

-- Additional Features
('customServices', 'Custom Services', 'additional_features', 110),
('socialMediaUrls', 'Social Media URLs', 'additional_features', 111),
('relevantLocation', 'Relevant Location', 'additional_features', 112),

-- Import Function (special entry for import permission)
('import_function', 'Import Function', 'import_function', 200);