// src/utils/useUsageCounter.jsx
import { useState } from 'react';

const DAILY_READ_LIMIT = 50000;

export const useUsageCounter = () => {
  const [usageCount] = useState(0);

  return {
    usageCount,
    DAILY_READ_LIMIT,
    usagePercentage: 0,
    isCritical: false,
    isLoading: false,
  };
};
