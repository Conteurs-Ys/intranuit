import { useDialogs } from '../context/DialogContext';

// Excel et ses constructeurs ne sont chargés qu’au premier clic sur un export.
export default function useExport() {
  const { showNotice } = useDialogs();
  const download = async (...args) => {
    try { const { downloadExport } = await import('../utils/downloadExport'); downloadExport(...args); }
    catch (error) { console.error(error); await showNotice('L’export a échoué. Réessaie dans un instant.'); }
  };
  return {
    exportAIP: (entries, month, options = { staff: true }) => download('aip', entries, `AIP_${month}`, options),
    exportInfluences: (entries, month, options = { staff: true }) => download('influence', entries, `Influences_${month}`, options),
    exportAIPByMonth: (entries, name = 'joueur') => download('aip', entries, `AIP_${name}_par_mois`),
    exportInfluencesByMonth: (entries, name = 'joueur') => download('influence', entries, `Influences_${name}_par_mois`),
  };
}
