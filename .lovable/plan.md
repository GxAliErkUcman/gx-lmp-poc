

## Findings

**Custom service descriptions ARE included in the JSON export.** Each business's `customServices` array contains `{ serviceName, serviceDescription, serviceCategoryId }` objects, and the export function passes them through directly at line 231 of `generate-json-export/index.ts`.

## Plan

Add inline helper text with examples to the **ClientCustomServicesDialog** (the admin panel's "Manage Custom Services" form) to clarify what "Service Name" and "Service Description" mean.

### Changes to `src/components/ClientCustomServicesDialog.tsx`

1. Below the "Service Name" label/input, add a helper paragraph:
   - *"The name of the service your business offers. This appears in the location's service list. Examples: 'EV Charging', 'Wheelchair Accessible Parking', 'Drive-Through Service'."*

2. Below the "Service Description" label (above the textarea), add a helper paragraph:
   - *"A brief explanation of what the service includes or how it works. This is exported alongside the service name. Examples: 'Fast charging up to 150kW available 24/7', 'Two dedicated accessible parking bays near the entrance'."*

Both will be styled as `text-xs text-muted-foreground` to match the existing character counter style.

