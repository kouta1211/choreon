// 暫定的に supabase/schema.sql を手で写した型定義。
// 実際のSupabaseプロジェクトに接続できたら
// `supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
// で生成される内容に置き換える(そちらが正式なソース・オブ・トゥルースになる)。

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          stage_width: number;
          stage_height: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          stage_width?: number;
          stage_height?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          stage_width?: number;
          stage_height?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      dancers: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          initial_direction: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          initial_direction?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          color?: string;
          initial_direction?: number;
          created_at?: string;
        };
      };
      scenes: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          order_index?: number;
          created_at?: string;
        };
      };
      positions: {
        Row: {
          scene_id: string;
          dancer_id: string;
          x_coordinate: number;
          y_coordinate: number;
          rotation_angle: number;
        };
        Insert: {
          scene_id: string;
          dancer_id: string;
          x_coordinate?: number;
          y_coordinate?: number;
          rotation_angle?: number;
        };
        Update: {
          scene_id?: string;
          dancer_id?: string;
          x_coordinate?: number;
          y_coordinate?: number;
          rotation_angle?: number;
        };
      };
    };
  };
};
