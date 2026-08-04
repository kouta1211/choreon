export type Scene = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
};

export type Position = {
  sceneId: string;
  dancerId: string;
  xCoordinate: number;
  yCoordinate: number;
  rotationAngle: number;
};
