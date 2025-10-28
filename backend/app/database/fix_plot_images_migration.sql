-- Migration script to fix plot_images table
-- Add missing 'url' column to plot_images table

-- Check if plot_images table exists, if not create it
CREATE TABLE IF NOT EXISTS plot_images (
    id SERIAL PRIMARY KEY,
    plot_id UUID NOT NULL,
    user_id UUID NOT NULL,
    url VARCHAR(500) NOT NULL,  -- This is the missing column
    filename VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    growth_stage VARCHAR(100),
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If table exists but missing url column, add it
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'plot_images' AND column_name = 'url'
    ) THEN
        ALTER TABLE plot_images ADD COLUMN url VARCHAR(500) NOT NULL DEFAULT '';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plot_images_plot_id ON plot_images(plot_id);
CREATE INDEX IF NOT EXISTS idx_plot_images_user_id ON plot_images(user_id);
CREATE INDEX IF NOT EXISTS idx_plot_images_timestamp ON plot_images(timestamp);

-- Sample data for testing (optional)
INSERT INTO plot_images (plot_id, user_id, url, filename, growth_stage) VALUES 
('931429d4-de8b-4d76-8f0e-7864af79696e', '8b7617ea-2437-402b-81f9-56f88ef2f8c8', '/uploads/plots/931429d4-de8b-4d76-8f0e-7864af79696e/seedling.jpg', 'seedling.jpg', 'seedling'),
('931429d4-de8b-4d76-8f0e-7864af79696e', '8b7617ea-2437-402b-81f9-56f88ef2f8c8', '/uploads/plots/931429d4-de8b-4d76-8f0e-7864af79696e/vegetative.jpg', 'vegetative.jpg', 'vegetative')
ON CONFLICT DO NOTHING;