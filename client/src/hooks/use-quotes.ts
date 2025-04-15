import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Quote, InsertQuote, SelectedFeature, SelectedPage } from "@shared/schema";

interface SaveQuoteParams {
  quote: InsertQuote;
  selectedFeatures: SelectedFeature[];
  selectedPages: SelectedPage[];
}

export function useQuotes() {
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: ['/api/quotes'],
    queryFn: () => apiRequest('/api/quotes')
  });

  const saveQuoteMutation = useMutation({
    mutationFn: async ({ quote, selectedFeatures, selectedPages }: SaveQuoteParams) => {
      return apiRequest('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          quote,
          selectedFeatures,
          selectedPages
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    }
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Quote> & { id: number }) => {
      return apiRequest(`/api/quotes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', variables.id] });
    }
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/quotes/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
    }
  });

  const useQuote = (id: number) => {
    return useQuery({
      queryKey: ['/api/quotes', id],
      queryFn: () => apiRequest(`/api/quotes/${id}`)
    });
  };

  return {
    quotesQuery,
    saveQuoteMutation,
    updateQuoteMutation,
    deleteQuoteMutation,
    useQuote
  };
}