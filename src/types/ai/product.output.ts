import { z } from "zod";

export const productCardVariantOutputSchema = z.object({
    id: z.string(),
    sku: z.string(),
    volumeMl: z.number(),
    basePrice: z.number()
});

export const productCardOutputItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    brandName: z.string(),
    primaryImage: z.string().nullable(),
    aiAcceptanceId: z.string().optional(),
    variants: z.array(productCardVariantOutputSchema)
});

export const productOutput = {
    schema: z.object({
        products: z.array(productCardOutputItemSchema)
    })
};

export const productOutputSchema = productOutput.schema;
export type ProductCardVariantOutput = z.infer<typeof productCardVariantOutputSchema>;
export type ProductCardOutputItem = z.infer<typeof productCardOutputItemSchema>;

export const convertProductCardOutputToProducts = (output: unknown): ProductCardOutputItem[] => {
    try {
        const jsonOutput = typeof output === 'string' ? JSON.parse(output) : output;

        // Handle direct array format: [{ id, name, ... }]
        if (Array.isArray(jsonOutput)) {
            const itemSchema = z.array(productCardOutputItemSchema);
            const parsedArray = itemSchema.safeParse(jsonOutput);

            if (!parsedArray.success) {
                console.error('[Product Output] Invalid array format from AI.', parsedArray.error.issues);
                return [];
            }
            return parsedArray.data;
        }

        // Handle object format: { products: [...] }
        const parsedOutput = productOutputSchema.safeParse(jsonOutput);

        if (!parsedOutput.success) {
            console.error('[Product Output] Invalid structured output from AI.', parsedOutput.error.issues);
            return [];
        }

        if (!parsedOutput.data.products || parsedOutput.data.products.length === 0) {
            console.warn('[Product Output] AI returned empty products array.');
            return [];
        }
        return parsedOutput.data.products;
    } catch (error) {
        console.error('[Product Output] Error parsing structured output:', error);
        return [];
    }
};
