'use client';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Cada animación se carga sólo en el navegador (usan window / IntersectionObserver).
const L = () => <div style={{ minHeight: 320, borderRadius: 24, background: '#ECECEF' }} aria-label="Cargando animación" />;
const load = (f: () => Promise<{ default: ComponentType }>) => dynamic(f, { ssr: false, loading: L });

export const PARTS: Record<string, ComponentType> = {
  InstalarFregadero:        load(() => import('./anim/InstalarFregadero')),
  InstalarLavabo:           load(() => import('./anim/InstalarLavabo')),
  InstalarGasEstufa:        load(() => import('./anim/InstalarGasEstufa')),
  InstalarBomba:            load(() => import('./anim/InstalarBomba')),
  InstalarHidroneumatico:   load(() => import('./anim/InstalarHidroneumatico')),
  BombaSistemasIncorrectos: load(() => import('./anim/BombaSistemasIncorrectos')),
  BrocaMetal:               load(() => import('./anim/BrocaMetal')),
  CableDelgadoPeligro:      load(() => import('./anim/CableDelgadoPeligro')),
  CableEInterruptor:        load(() => import('./anim/CableEInterruptor')),
  ExtensionSobrecargada:    load(() => import('./anim/ExtensionSobrecargada')),
  ComparativaFocos:         load(() => import('./anim/ComparativaFocos')),
  MantenimientoCortina:     load(() => import('./anim/MantenimientoCortina')),
  CalculadoraYTipsImpermeabilizante: load(() => import('./anim/CalculadoraYTipsImpermeabilizante')),
  PasosImpermeabilizar:     load(() => import('./anim/PasosImpermeabilizar')),
  ProductosImpermeabilizante: load(() => import('./anim/ProductosImpermeabilizante')),
  PasosPintar:              load(() => import('./anim/PasosPintar')),
  ConoceTuberias:           load(() => import('./anim/ConoceTuberias')),
  TuberiaCortada:           load(() => import('./anim/TuberiaCortada')),
  MedirManguera:            load(() => import('./anim/MedirManguera')),
  MedirMangueraNivel:       load(() => import('./anim/MedirMangueraNivel')),
  MedirPoliducto:           load(() => import('./anim/MedirPoliducto')),
  RecepcionLlamadas:        load(() => import('./anim/RecepcionLlamadas')),
  ProcesoFacturacion:       load(() => import('./anim/ProcesoFacturacion')),
};
