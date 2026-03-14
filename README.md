# Fondoscope

Fondoscope es una aplicación para consultar y comparar fondos de inversión a partir de su ISIN.

La idea es simple: introduces uno o varios fondos, eliges la divisa de cada uno y obtienes una vista clara de su evolución histórica, su comportamiento relativo y sus métricas principales.

## Qué puede hacer la aplicación

- comparar varios fondos al mismo tiempo
- cargar fondos por ISIN de forma rápida
- asignar una divisa distinta a cada fondo
- visualizar la evolución en un gráfico comparativo
- alternar entre vista visual y tabla comparativa
- analizar distintos periodos: `1M`, `6M`, `1Y`, `3Y`, `5Y`, `YTD` y `MAX`
- consultar métricas de rentabilidad y riesgo
- revisar incidencias o fondos que no se hayan podido resolver correctamente

## Qué ve el usuario

La aplicación está pensada para que la comparación sea inmediata y fácil de leer.

### Entrada de fondos

El usuario puede pegar varios ISIN:

- uno por línea
- separados por comas
- separados por espacios

La app detecta los ISIN automáticamente y genera una lista editable donde se puede:

- cambiar la divisa de cada fondo
- eliminar fondos antes de lanzar la consulta

### Visualización comparativa

Una vez cargados los datos, la aplicación muestra:

- gráfico de comparación entre fondos
- tarjetas individuales con información resumida
- tabla comparativa con métricas del periodo seleccionado

### Métricas principales

Entre las métricas que se muestran están:

- rentabilidad acumulada
- rentabilidad anualizada
- volatilidad anualizada
- máximo drawdown
- recuperación del drawdown
- ratio retorno/volatilidad
- observaciones disponibles
- antigüedad del histórico

## Para quién está pensada

Puede resultar útil para:

- inversores particulares que comparan varios fondos
- analistas que quieren una vista rápida por ISIN
- usuarios que necesitan revisar fondos en distintas divisas

## Cómo se usa

1. Introduce uno o varios ISIN.
2. Ajusta la divisa de cada fondo si lo necesitas.
3. Pulsa en consultar.
4. Cambia el rango temporal para comparar el comportamiento en distintos horizontes.
5. Alterna entre gráfico, tarjetas y tabla para analizar los resultados.

## Fuente de datos

La aplicación obtiene históricos y metadatos a partir de endpoints públicos de Morningstar.

Esto implica que:

- la disponibilidad depende del proveedor externo
- cambios en la respuesta de Morningstar pueden afectar la extracción
- la velocidad de carga puede variar según la respuesta remota

## Desarrollo local

### Requisitos

- Node.js 20 o superior recomendado
- Python 3.13
- `npm`

### Instalación

```bash
npm install
python3 -m venv .venv
. .venv/bin/activate
pip install pandas requests
```

### Arranque

```bash
npm run dev
```

La aplicación quedará disponible normalmente en `http://localhost:3000`.

## Despliegue

El proyecto está preparado para desplegarse en Vercel.

La arquitectura actual mantiene el mismo endpoint público para el frontend y utiliza Python para la obtención de datos en producción.

## Stack técnico

- Next.js
- React
- Recharts
- Python
- pandas
- requests
- Vercel

## Estado del proyecto

- funcional en local
- preparado para Vercel
- sin caché local

## Licencia

Pendiente de definir.
