# experiments/decompose

Asset → WGSL / WebGPU **decomposition** experiments.

See [docs/Decomposition.md](../../docs/Decomposition.md) for the full plan.

## Quick orientation

- **Export** (stable library): WGSL → files  
- **Decompose** (this folder): files → WGSL / WebGPU helpers  

Start with **Level 0** (metadata round-trip), then **Level 1** (texture display wrapper).

No public API is exported from package root until this graduates.
