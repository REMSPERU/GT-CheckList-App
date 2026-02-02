import { supabase } from '@/lib/supabase';
import { PropertyResponse } from '@/types/api';

export interface Company {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  raz_social: string | null;
  RUC: string | null;
}

export interface CompanyPropertyAssignment {
  id_company: string;
  id_property: string;
}

class SupabaseCompanyService {
  private companyTable = 'company';
  private propertyTable = 'properties';
  private assignmentTable = 'company_property';

  /**
   * List all companies (providers).
   */
  async listCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from(this.companyTable)
      .select('*');

    if (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * List all properties.
   */
  async listProperties(): Promise<Pick<PropertyResponse, 'id' | 'name'>[]> {
    const { data, error } = await supabase
      .from(this.propertyTable)
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Get all company IDs assigned to a specific property.
   * @param propertyId The ID of the property.
   */
  async getAssignmentsForProperty(propertyId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from(this.assignmentTable)
      .select('id_company')
      .eq('id_property', propertyId);

    if (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
    return data ? data.map(a => a.id_company) : [];
  }

  /**
   * Assign a company to a property.
   * @param companyId The ID of the company.
   * @param propertyId The ID of the property.
   */
  async assignCompanyToProperty(
    companyId: string,
    propertyId: string,
  ): Promise<CompanyPropertyAssignment> {
    const { data, error } = await supabase
      .from(this.assignmentTable)
      .insert({ id_company: companyId, id_property: propertyId })
      .select()
      .single();

    if (error) {
      console.error('Error assigning company:', error);
      throw error;
    }
    return data;
  }

  /**
   * Unassign a company from a property.
   * @param companyId The ID of the company.
   * @param propertyId The ID of the property.
   */
  async unassignCompanyFromProperty(
    companyId: string,
    propertyId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from(this.assignmentTable)
      .delete()
      .eq('id_company', companyId)
      .eq('id_property', propertyId);

    if (error) {
      console.error('Error unassigning company:', error);
      throw error;
    }
  }
}

export const supabaseCompanyService = new SupabaseCompanyService();
