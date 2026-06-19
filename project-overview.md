# Project Overview: PD Jewellers

## Executive Summary
PD Jewellers is an elegant, premium e-commerce web application dedicated to showcasing and selling fine jewelry. The platform combines a highly polished, light-themed, Asian-inspired visual identity with advanced interactive 3D capabilities. It allows customers not only to browse collections but also to customize bespoke jewelry pieces in a real-time "Custom 3D Studio," complete with Augmented Reality (AR) try-on functionality.

## Core Visual Identity
- **Theme**: Light, airy, and sophisticated (Paper white backgrounds with deep ink text).
- **Accents**: Gold gradients and warm tones to convey luxury.
- **Typography**: A combination of classic serif (Playfair Display) for headings and modern sans-serif (Montserrat) for body text and navigation.
- **Mood**: Elegant, premium, timeless, and bespoke.

## Key Features

### 1. Landing Page (Home)
- Immersive hero section with overlapping text, concentric circle accents, and lifestyle imagery.
- Statistics showcasing trust (years of excellence, custom creations, satisfied customers).
- Staggered collection cards with subtle hover zoom effects.
- Client testimonial section with star ratings.
- Horizontal, scrollable "Shining with our clients" lifestyle gallery.

### 2. Custom 3D Studio (Configurator)
A major highlight of the platform, allowing users to deeply customize jewelry before purchase. 
- **Real-Time 3D Rendering**: Built using Three.js and React Three Fiber.
- **Jewelry Types**: Supports rings and pendants.
- **Ring Styles**: Includes parametrically generated models like Pavé Solitaire, Three-Stone Princess, Vintage Twist, Classic Engraved Band, Braided Men's Band.
- **Custom GLB Support**: Supports loading external `.glb` 3D assets (e.g., custom engagement rings) and programmatically mapping user-selected materials (metals vs. stones) based on mesh bounding boxes and naming conventions.
- **Customization Options**:
  - **Metals**: Yellow Gold, White Gold, Rose Gold, Platinum.
  - **Center Stones**: Diamond, Sapphire, Ruby, Emerald, Aquamarine.
  - **Engraving**: Real-time 3D text engraving with selectable font styles (Helvetiker, Playfair, Great Vibes, Pacifico).
- **AR Try-On**: Utilizes WebXR (`@react-three/xr`) to allow users to visualize the jewelry in their real environment via their mobile device camera.

### 3. Shopping Experience
- Slide-out cart drawer for easy access.
- Dynamic pricing based on selected styles (e.g., bands vs. complex solitaire rings).

## Technology Stack
- **Frontend Framework**: React 18, Vite
- **Styling**: Tailwind CSS (extensively customized with specific color tokens and gradients), CSS variables.
- **Animations**: Motion (`motion/react`) for page transitions and scroll reveals.
- **3D Graphics**: `three`, `@react-three/fiber`, `@react-three/drei`
- **Augmented Reality**: `@react-three/xr`
- **Routing**: `react-router-dom`
- **Icons**: `lucide-react`

## Goal for Redesign / Further Iteration
The resulting application is structured to serve as a high-end showcase. Any AI agent or developer continuing work on this codebase should maintain the strict, minimalist-yet-warm design language, relying on generous negative space, sophisticated typography combinations, and smooth 3D interactions rather than cluttered UI elements.
