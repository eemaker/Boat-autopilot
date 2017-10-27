#include "NavigationData.h"


NavigationData::NavigationData(std::vector<Coordinate> completed_path, std::vector<Coordinate> path,
	int ete, double progress) : Completed_path_(completed_path), Path_(path)
{
	Ete_ = ete;
	//Bound checking on progress
	if (progress < 0) { Progress_ = 0; }
	else if (progress > 100) { Progress_ = 100; }
	else Progress_ = progress;
}

NavigationData::~NavigationData()
{
}
