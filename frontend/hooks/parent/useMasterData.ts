// hooks/useMasterData.ts
import { useState, useEffect } from 'react';
import API_URL from '@/constants/api'; // Your API URL

export function useMasterData() {
  const [masterCategories, setMasterCategories] = useState<any[]>([]);
  const [masterJobs, setMasterJobs] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const response = await fetch(`${API_URL}/parent/get_master_data.php`);
        const data = await response.json();
        
        if (data.success) {
          setMasterCategories(data.categories);
          setMasterJobs(data.jobs);
        }
      } catch (error) {
        console.error("Failed to fetch master data", error);
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  return { masterCategories, masterJobs, loadingMaster };
}